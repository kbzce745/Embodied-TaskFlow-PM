import os
import json
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# 引入我们编写的规划器与安全引擎
from src.planner.llm_planner import GeminiTaskPlanner, TaskPlanningResponse
from src.safety_engine.safety_interceptor import SafetyInterceptor, SafetyException

app = FastAPI(title="Embodied-TaskFlow Control Hub Backend")

# 获取当前文件所在目录，从而定位静态资源
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(CURRENT_DIR, "static")

class PlanRequest(BaseModel):
    session_id: str
    instruction: str
    perception_context: Dict[str, Any]

class VerifyRequest(BaseModel):
    node_label: str
    parameters: Optional[Dict[str, Any]] = None
    sensor_data: Dict[str, Any]

class BadcaseLog(BaseModel):
    session_id: str
    raw_instruction: str
    execution_result: str
    failure_reason: Dict[str, Any]
    trajectory_history: list

@app.post("/api/plan")
async def api_plan(request: PlanRequest):
    """大模型任务分解接口"""
    try:
        # 默认实例化规划器，若无相关环境变量自动降级为 Mock
        planner = GeminiTaskPlanner()
        response = planner.plan_task(
            session_id=request.session_id,
            instruction=request.instruction,
            perception_context=request.perception_context
        )
        return response.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify")
async def api_verify(request: VerifyRequest):
    """端侧安全策略校验接口"""
    interceptor = SafetyInterceptor()
    try:
        interceptor.verify_action(
            node_label=request.node_label,
            parameters=request.parameters,
            sensor_data=request.sensor_data
        )
        return {"status": "SUCCESS"}
    except SafetyException as e:
        # 安全反射拦截触发，返回急停标志 (ESTOP)
        return {
            "status": "ESTOP",
            "event_code": e.event_code,
            "description": e.description,
            "raw_data": e.raw_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/badcase")
async def api_badcase(request: BadcaseLog):
    """PM 坏案回收与标注归档接口"""
    try:
        # 归档路径定位在项目文档下的 evaluation 目录中
        log_dir = os.path.abspath(os.path.join(CURRENT_DIR, "..", "docs", "evaluation"))
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "badcases.jsonl")
        
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(request.model_dump(), ensure_ascii=False) + "\n")
            
        return {"status": "SAVED", "filepath": log_file}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 挂载静态文件目录以供网页端访问
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def read_index():
    """默认返回主操作面板页面"""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Static front-end index.html not found.")

if __name__ == "__main__":
    import uvicorn
    # 本地启动服务器，方便调试
    uvicorn.run(app, host="127.0.0.1", port=8000)
