import pytest
from src.planner.llm_planner import GeminiTaskPlanner, BehaviorTreeNode, TaskPlanningResponse
from src.safety_engine.safety_interceptor import SafetyInterceptor, SafetyException

def test_normal_task_planning():
    """测试常规无安全威胁任务的拆解与树形结构"""
    planner = GeminiTaskPlanner(use_mock=True)
    
    context = {
        "objects": [{"label": "dirty_cup", "confidence": 0.95, "bbox_3d": [1.0, 0.2, 0.8, 0.1, 0.1, 0.12]}],
        "obstacle_grid_map": "mock_data_compressed"
    }
    
    response = planner.plan_task(
        session_id="test_session_001",
        instruction="把脏杯子放回厨房水槽",
        perception_context=context
    )
    
    assert response.status == "SUCCESS"
    assert response.session_id == "test_session_001"
    
    root = response.root_node
    assert root.type == "Sequence"
    assert len(root.children) == 3
    
    # 验证行为树的动作流程是否正常
    assert root.children[0].node_id == "act_pick_cup"
    assert root.children[1].node_id == "act_nav_kitchen"
    assert root.children[2].node_id == "act_place_sink"


def test_hot_coffee_safety_intercept():
    """测试搬运高温咖啡时触发 SEC-004 安全拦截与 ESTOP 响应"""
    planner = GeminiTaskPlanner(use_mock=True)
    interceptor = SafetyInterceptor()
    
    context = {
        "objects": [{"label": "coffee_cup", "confidence": 0.98, "bbox_3d": [1.1, 0.3, 0.8, 0.1, 0.1, 0.15]}],
        "obstacle_grid_map": "mock_data_compressed"
    }
    
    response = planner.plan_task(
        session_id="test_session_002",
        instruction="倒一杯热咖啡送过来",
        perception_context=context
    )
    
    assert response.status == "SUCCESS"
    root = response.root_node
    
    # 找出行为树中的安全温度判断节点并模拟执行
    temp_check_node = root.children[0]
    assert temp_check_node.node_id == "cond_temp_check"
    
    # 模拟环境温度读取传感器数据：咖啡温度 72 摄氏度
    mock_sensor_data = {
        "liquid_temperature": 72.0,
        "human_distance": 1.5
    }
    
    # 执行校验，应抛出高温安全拦截异常 (ESTOP)
    with pytest.raises(SafetyException) as exc_info:
        interceptor.verify_action(
            node_label=temp_check_node.label,
            parameters=temp_check_node.parameters,
            sensor_data=mock_sensor_data
        )
        
    assert exc_info.value.event_code == "SEC-004"
    assert "温度" in exc_info.value.description
    assert exc_info.value.raw_data["sensor_snapshot"]["liquid_temperature"] == 72.0


def test_human_closeness_safety_intercept():
    """测试人员贴近机器人运动路径时触发 SEC-001 安全拦截"""
    interceptor = SafetyInterceptor()
    
    # 模拟人类入侵安全距离阈值 0.2m (限制值为 0.3m)
    mock_sensor_data = {
        "liquid_temperature": 25.0,
        "human_distance": 0.2
    }
    
    with pytest.raises(SafetyException) as exc_info:
        interceptor.verify_action(
            node_label="任意移动或工作动作",
            parameters={},
            sensor_data=mock_sensor_data
        )
        
    assert exc_info.value.event_code == "SEC-001"
    assert "存在活体" in exc_info.value.description
