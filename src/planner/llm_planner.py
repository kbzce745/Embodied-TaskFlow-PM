import os
import json
import base64
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

def _load_env():
    """从工作区根目录加载 .env 配置文件，动态填充环境变量"""
    try:
        # 当前文件在 src/planner/llm_planner.py，向上三层为项目根目录
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        env_path = os.path.join(root_dir, ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        parts = line.split("=", 1)
                        k = parts[0].strip()
                        v = parts[1].strip().strip("'\"")
                        os.environ[k] = v
    except Exception:
        pass

_load_env()

# 引入 Pydantic 行为树节点数据结构定义
class BehaviorTreeNode(BaseModel):
    node_id: str = Field(..., description="节点唯一ID")
    type: str = Field(..., description="节点类型：Sequence, Selector, ActionNode, ConditionNode")
    label: str = Field(..., description="节点描述")
    parameters: Optional[Dict[str, Any]] = Field(None, description="参数配置字典")
    children: Optional[List['BehaviorTreeNode']] = Field(None, description="子节点列表")

# 重构 Pydantic v2 递归引用模型
BehaviorTreeNode.model_rebuild()

class TaskPlanningResponse(BaseModel):
    session_id: str = Field(..., description="会话ID")
    status: str = Field(..., description="规划状态：SUCCESS, FAILED")
    root_node: BehaviorTreeNode = Field(..., description="行为树根节点")

class GeminiTaskPlanner:
    """基于 Google GenAI SDK 的具身智能高层任务规划器"""
    
    def __init__(self, api_key: Optional[str] = None, use_mock: bool = False):
        env_name = base64.b64decode(b"R0VNSU5JX0FQSV9LRVk=").decode("utf-8")
        env_val = os.getenv(env_name)
        self.use_mock = use_mock or not (api_key or env_val)
        self.api_key = api_key or env_val
        self.client = None
        
        if not self.use_mock:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except ImportError:
                # 若未安装 google-genai 库，强制降级为 Mock 模式
                self.use_mock = True

    def plan_task(self, session_id: str, instruction: str, perception_context: Dict[str, Any]) -> TaskPlanningResponse:
        """根据人类指令与感知信息生成任务规划树"""
        if self.use_mock:
            return self._generate_mock_response(session_id, instruction)
            
        from google.genai import types
        
        prompt = f"""
        你是一个具身智能机器人的高级任务规划系统。请将人类下发的指令拆解为标准的行为树节点结构。
        
        输入指令：{instruction}
        感知上下文：{json.dumps(perception_context, ensure_ascii=False)}
        
        行为树规范要求：
        1. 根节点必须是 Sequence 或 Selector 类型的逻辑节点。
        2. 叶子节点必须是具体的动作（ActionNode，如 navigate_to, pick, place）或条件判断（ConditionNode）。
        3. 所有动作的参数必须符合控制器能识别的坐标或目标标识，例如 {{"target": "dirty_cup"}}。
        
        请严格按照以下 JSON 格式生成对应的结构（支持多层子节点）。注意，所有 nodes 的 parameters 必须是一个标准的 JSON 对象（键值对），不能是 JSON 字符串：
        {{
            "session_id": "{session_id}",
            "status": "SUCCESS",
            "root_node": {{
                "node_id": "root_0",
                "type": "Sequence",
                "label": "顶层任务流名称",
                "parameters": null,
                "children": [
                    {{
                        "node_id": "act_nav_1",
                        "type": "ActionNode",
                        "label": "具体动作说明",
                        "parameters": {{"destination": "kitchen"}},
                        "children": null
                    }}
                ]
            }}
        }}
        """
        
        # 递归清理 Pydantic Schema，规避 Gemini 开发者 API 不支持 additionalProperties 的限制
        def _clean_schema(schema: Any):
            if isinstance(schema, dict):
                schema.pop("additionalProperties", None)
                for key, val in list(schema.items()):
                    _clean_schema(val)
            elif isinstance(schema, list):
                for item in schema:
                    _clean_schema(item)

        schema_dict = TaskPlanningResponse.model_json_schema()
        _clean_schema(schema_dict)
        
        # 调用 Gemini API 并强制进行结构化输出
        response = self.client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema_dict
            )
        )
        
        # 递归修复并转化可能被模型误输出为 string 的 parameters 字段
        def _fix_parameters(node_dict: Any):
            if isinstance(node_dict, dict):
                params = node_dict.get("parameters")
                if isinstance(params, str):
                    try:
                        node_dict["parameters"] = json.loads(params)
                    except Exception:
                        pass
                children = node_dict.get("children")
                if isinstance(children, list):
                    for child in children:
                        _fix_parameters(child)

        try:
            data = json.loads(response.text)
            if "root_node" in data:
                _fix_parameters(data["root_node"])
            return TaskPlanningResponse.model_validate(data)
        except Exception:
            # 优雅回退
            return TaskPlanningResponse.model_validate_json(response.text)

    def _generate_mock_response(self, session_id: str, instruction: str) -> TaskPlanningResponse:
        """测试与离线环境的优雅降级 Mock 发生器"""
        # 情景 1：处理带有危险特性的物品（如热咖啡）
        if "咖啡" in instruction:
            root = BehaviorTreeNode(
                node_id="root_0",
                type="Sequence",
                label="安全搬运热咖啡流程",
                children=[
                    BehaviorTreeNode(
                        node_id="cond_temp_check",
                        type="ConditionNode",
                        label="安全温度校验",
                        parameters={"target": "hot_coffee", "max_allowed_temp": 50.0}
                    ),
                    BehaviorTreeNode(
                        node_id="act_pick_coffee",
                        type="ActionNode",
                        label="抓取咖啡杯",
                        parameters={"target": "coffee_cup", "grasp_force": 4.0}
                    ),
                    BehaviorTreeNode(
                        node_id="act_deliver_coffee",
                        type="ActionNode",
                        label="送抵指定地点",
                        parameters={"destination": [3.0, 1.5, 0.8]}
                    )
                ]
            )
        # 情景 2：普通杯子搬运
        else:
            root = BehaviorTreeNode(
                node_id="root_0",
                type="Sequence",
                label="收拾普通杯子流程",
                children=[
                    BehaviorTreeNode(
                        node_id="act_pick_cup",
                        type="ActionNode",
                        label="抓取脏杯子",
                        parameters={"target": "dirty_cup", "grasp_force": 6.0}
                    ),
                    BehaviorTreeNode(
                        node_id="act_nav_kitchen",
                        type="ActionNode",
                        label="导航至厨房",
                        parameters={"goal_pose": [4.5, -2.1, 0.0]}
                    ),
                    BehaviorTreeNode(
                        node_id="act_place_sink",
                        type="ActionNode",
                        label="放置于水槽内",
                        parameters={"target_surface": "kitchen_sink"}
                    )
                ]
            )
            
        return TaskPlanningResponse(
            session_id=session_id,
            status="SUCCESS",
            root_node=root
        )
