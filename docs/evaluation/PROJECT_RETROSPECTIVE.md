# 项目整体回顾与产品审计报告 (Project Retrospective & Product Audit Report)

- **项目名称**：Embodied-TaskFlow
- **审计日期**：2026-06-22
- **角色**：资深具身智能产品经理 (Embodied AI PM)
- **关联文档**：
  - 产品需求文档: [PRD-001-embodied-task-planning.md](file:///D:/embodied-taskflow/docs/prd/PRD-001-embodied-task-planning.md)
  - 系统分层设计: [SYS-001-architecture-spec.md](file:///D:/embodied-taskflow/docs/system_design/SYS-001-architecture-spec.md)
  - 安全规则与飞轮设计: [SYS-002-safety-rules-and-data-flywheel.md](file:///D:/embodied-taskflow/docs/system_design/SYS-002-safety-rules-and-data-flywheel.md)
  - 评测指标与仪表盘: [VAL-001-metrics-dashboard.md](file:///D:/embodied-taskflow/docs/evaluation/VAL-001-metrics-dashboard.md)

## 1. 项目整体交付表现与承诺对比 (Project Achievements vs Commitments)

- **第一阶段：产品定义与系统建模**：全部完成。交付了完备的 PRD-001、SYS-001、SYS-002 文档，明确了系统边界和机器人 Affordance 校验规则。
- **第二阶段：核心规划引擎与安全策略**：全部完成。核心 Python 后端 llm_planner.py 接入真实的 Gemini API 接口，并实现了包含 ESTOP 机制的 safety_interceptor.py。
- **第三阶段：仿真模拟与 PM 看板构建**：全部完成。开发了基于 HTML5 Canvas 的高保真 2D 物理仿真沙盒，配合 Chart.js 构建了 PM 看板，成功实现了“任务规划 -> 拦截判定 -> 沙盒运行 -> 人工干预与坏案标记归档”的全生命周期闭环。

## 2. 基于 PM 框架的产品深度审查 (Product Audit & 4Ls Review)

我们采用 4Ls (Liked / Learned / Lacked / Longed For) 产品管理模型对项目进行全方位审计：

### A. Liked (喜欢/做得出彩的部分)
- **高鲁棒性的行为树执行机制**：前端在 app.js 中较好地处理了节点名称匹配，通过引入多维度语义模糊匹配和 waitForArrival 路径坐标到达检测，成功承接了由真实 Gemini 大模型输出的动态、任意结构的行为树节点动作。
- **直观易用的 HITL（人机在环）遥控器与坏案一键归档**：操作面板的 Teleoperation 摇杆能实时控制 Canvas 机器人移动，且“打标并标出 JSONL 导出”按钮成功将失败会话实时追加写入 docs/evaluation/badcases.jsonl，真正跑通了具身智能产品最核心的“数据飞轮”数据流。
- **云端协同安全架构设计**：safety_interceptor.py 可在 20ms 内触发 ESTOP，前端能够即时闪烁红色锁定警报并冻结运动，完美体现了 ISO 13482 和 ISO 10218 个人护理及工业协作机器人安全标准中“安全反射”的产品底线。

### B. Learned (项目实施中的学到与认知提升)
- **非结构化输出的边界清洗**：大语言模型（如 Gemini）即使使用 Structured Output，在实际复杂指令下也可能会返回包含 Markdown 标记或多余空白的 JSON 字符串。为此我们在 llm_planner.py 中引入了 _clean_schema 及高容错 JSON 解析，这向我们证明在具身智能高层规划中，后端必须配置专职的规划过滤器与语法清洗层。
- **仿真模拟器对控制环路的保真度**：在 2D 仿真中，机器人运动的缓动与状态机的节点同步极为关键。物理仿真不仅仅是“播放动画”，而是一个带有实时位置传感器和碰撞反馈的闭环，这是保证评测指标（如 PER）可信的基石。

### C. Lacked (当前版本中的不足与优化空间)
- **大模型响应延迟（LLM Latency）**：接入真实 Gemini API 后，虽然规划的智能程度和泛化性极大提升，但单次规划树生成的耗时依赖网络状况（通常在 1 至 3 秒）。这与 PRD 中“规划生成延迟 <= 2.0s”的要求在网络差时存在冲突。未来需要引入云端推理流式传输（Streaming）或端侧边缘推理。
- **局部路径避障（Local Obstacle Avoidance）**：当用户在界面触发“人影靠近”时，当前安全引擎执行的是全局 ESTOP（紧急停止），但在真实业务场景中，机器人应该尝试局部避障绕行（如 DWA/TEB 局部规划），只有避障失败或极其靠近（小于 0.5 米）时才彻底断电停止。

### D. Longed For (未来阶段期望拥有的功能)
- **多模态 VLM 感知融合**：当前环境的目标物体位置是基于预设的 2D 坐标。未来应支持上传真实的 RGB-D 现场照片，通过 VLM (如 Gemini Flash 视觉模型) 提取物品的真实 3D 边界框（Bounding Box）坐标，直接传递给 llm_planner.py 进行位置校验。
- **云端数据流回流微调闭环**：当前坏案导出为本地的 badcases.jsonl，未来应当将此坏案数据流通过 API 自动上报到云端数据集仓，并自动触发大模型 SFT（监督微调）任务，实现真正的无人化数据自我进化飞轮。

## 3. 行动计划 (Prioritized Action Items)

| 优先级 | 核心行动项 | 负责人 | 期望完成时间 | 成功指标 |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | 优化真实 Gemini API 规划的网络容错与加载动画，提供兜底重试机制 | 后端开发 / PM | 2026-06-30 | 在弱网环境下大模型请求超时时能优雅给出友好提示并允许用户一键重试。 |
| **P1** | 升级 docs/evaluation/badcases.jsonl 文件读写机制，防止多并发写冲突并提供数据去重 | 后端开发 | 2026-06-30 | 并发打标时数据不丢失、不损坏，且 JSONL 结构完全合法。 |
| **P2** | 在 PM 评测看板中引入 Path Efficiency Ratio (PER) 实时折线图绘制 | 前端开发 | 2026-07-05 | Canvas 执行完毕后，Chart.js 会动态算出 PER 并更新至右上角的趋势图表中。 |
