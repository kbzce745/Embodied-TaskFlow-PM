# Tasks

- [x] **Phase 1: Configurations and Backend Server**
  - [x] Update `D:\embodied-taskflow\requirements.txt` to include fastapi
### 阶段三: 后端打通与联调测试 (Current)
- [x] 配置 `.env` 用于存储 Gemini API 密钥
- [x] 后端 `main.py` 和 `llm_planner.py` 集成真实的 Gemini API
- [x] 处理大模型返回的动态 JSONL 参数和 Schema 清理
- [x] 验证真实 Gemini 接口能否正确生成行为树（已通过单元测试）
- [x] 修复前端沙盒的仿真模拟循环，适应大模型生成的动态行为树节点（解决沙盒不移动问题）taskflow\src\main.py` FastAPI backend server
- [x] **Phase 2: Static Front-end Assets**
  - [x] Create folder `D:\embodied-taskflow\src\static\`
  - [x] Create `D:\embodied-taskflow\src\static\index.html` main layout
  - [x] Create `D:\embodied-taskflow\src\static\style.css` dark glassmorphism styling
  - [x] Create `D:\embodied-taskflow\src\static\app.js` canvas engine and charts logic
- [x] **Phase 3: Verification**
  - [x] Install uvicorn/fastapi dependencies
  - [x] Launch application locally and verify functionality
  - [x] Update walkthrough document
