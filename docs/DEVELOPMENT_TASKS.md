# 开发任务列表

- [x] **阶段 1: 配置与后端服务器**
  - [x] 更新 `D:\embodied-taskflow\requirements.txt` 以包含 fastapi
- [x] **阶段 2: 静态前端资源**
  - [x] 创建文件夹 `D:\embodied-taskflow\src\static\`
  - [x] 创建 `D:\embodied-taskflow\src\static\index.html` 主布局
  - [x] 创建 `D:\embodied-taskflow\src\static\style.css` 深色玻璃拟物化样式
  - [x] 创建 `D:\embodied-taskflow\src\static\app.js` Canvas 引擎与图表逻辑
- [x] **阶段 3: 后端打通、联调测试与验证**
  - [x] 配置 `.env` 用于存储 Gemini API 密钥
  - [x] 后端 `main.py` 和 `llm_planner.py` 集成真实的 Gemini API
  - [x] 处理大模型返回的动态 JSONL 参数和 Schema 清理
  - [x] 验证真实 Gemini 接口能否正确生成行为树（已通过单元测试）
  - [x] 修复前端沙盒的仿真模拟循环，适应大模型生成的动态行为树节点（解决沙盒不移动问题）
  - [x] 安装 uvicorn/fastapi 依赖项
  - [x] 在本地启动应用程序并验证功能
  - [x] 更新演示说明文档 (walkthrough)
