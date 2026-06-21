# 行为树节点用户故事与工作故事规范 (PRD-002-node-user-stories)

- **文档编号**：PRD-002
- **文档状态**：草案 (Draft)
- **版本**：v1.0.0
- **创建时间**：2026-06-21
- **Owner**：具身智能产品组 (Embodied AI Product Team)

---

## 1. 行为树动作节点用户故事 (Action Node User Stories)

本节遵循 3C 原则和 INVEST 标准，对机器人底层执行动作（Navigate 导航、Pick 抓取）的产品验收标准进行定义。

### 1.1 故事一：自主导航节点 (Navigate Skill Node)

**标题**：自适应避障移动与底盘定位

**描述**：作为算法集成商和现场用户，我希望机器人的自主导航（Navigate）节点能够根据环境中的障碍物和地表材质自适应规划平稳轨迹并准确抵达目标姿态（Goal Pose），以便机器人能够在复杂家庭环境中无损行进。

**设计/图纸链接**：[D:/embodied-taskflow/docs/system_design/SYS-001-architecture-spec.md](file:///D:/embodied-taskflow/docs/system_design/SYS-001-architecture-spec.md) 技能库子系统接口。

**验收标准**：
1. **目标点精度 (Goal Pose Accuracy)**：机器人在平整地表导航结束时，底盘中心最终停止位置与云端规划的目标坐标误差 $\le \pm 0.05\text{ 米}$，航向角（Yaw）误差 $\le \pm 3.0\text{ 度}$。
2. **状态返回值完整性 (BT Returns)**：
   - 导航中，节点必须高频（>= 10Hz）返回 `RUNNING` 状态及剩余距离。
   - 顺利抵达且底盘完全静止后，返回 `SUCCESS`。
   - 路径被强行封死且重规划失败后，返回 `FAILURE`。
3. **动态障碍物规避 (Dynamic Obstacle Avoidance)**：在运动过程中，若行进路线 1.0 米内出现动态物体（如走动的人），底盘最大线减速度不低于 $1.5\text{ m/s}^2$，且能够自动规划局部旁路绕行。
4. **地形自适应控制 (Terrain Adaptability)**：检测到地面介质切换（如木地板过渡到厚地毯）时，电机的阻抗及驱动力矩应自动补偿，车身俯仰角（Pitch）波动幅度 $\le \pm 5.0\text{ 度}$，防止搬运水杯时溢出。

---

### 1.2 故事二：双臂自适应抓取节点 (Pick Skill Node)

**标题**：基于六维力反馈的多材质物体抓取

**描述**：作为现场用户，我希望机器人的抓取（Pick）节点能根据 VLM 识别的物体材质和估算物理特性自适应调整抓取力，并在抓取过程中进行滑移检测，以便能安全、不损坏地搬运从易碎纸杯到沉重铁盒等各种家庭物品。

**设计/图纸链接**：[D:/embodied-taskflow/docs/system_design/SYS-002-safety-rules-and-data-flywheel.md](file:///D:/embodied-taskflow/docs/system_design/SYS-002-safety-rules-and-data-flywheel.md) 安全阈值表。

**验收标准**：
1. **触觉力控精度 (Force Control)**：机械爪端侧力传感器反馈力误差 $\le \pm 0.5\text{ N}$。抓取气球、纸杯等软质易碎品时，稳态抓取夹持力需维持在 $2.0\text{ N} - 4.0\text{ N}$，严禁产生形变或破裂。
2. **滑移补偿时延 (Slip Compensation)**：在提升物体的垂直阶段，若滑移传感器检测到微位移（滑移速度 $\ge 5\text{ mm/s}$），系统必须在 30 毫秒内介入，以 $2.0\text{ N}$ 阶梯递增夹紧力，直至滑移停止或达到最大极限力（25.0 N）。
3. **物体属性校验与拦截 (Weight & Size Check)**：
   - 抓取前，根据视觉点云估算的物体三维尺寸，若张角超出夹爪最大物理间距（120mm），直接返回 `FAILURE`。
   - 抓取后提升阶段，关节力矩推算的物体重量若 $> 5.0\text{ kg}$（单臂极限），触发保护性回放，放下物体并报告 `FAILURE`。
4. **状态反馈规范 (BT Status)**：
   - 伸臂及合拢阶段返回 `RUNNING`。
   - 确认夹紧且提升高度达 10cm、稳定无滑移 1 秒后，返回 `SUCCESS`。
   - 抓取落空或触发过载保护后，返回 `FAILURE`。

---

## 2. 系统异常与人机协同工作故事 (Safety & HITL Job Stories)

本节聚焦于用户在特定异常或安全场景下的核心动机和期望结果，使用 JTBD（工作故事）框架进行定义。

### 2.1 工作故事一：安全策略强行拦截 (ESTOP Intercept)

**标题**：安全威胁硬拦截与顺从响应

**描述**：当机器人正在执行大模型生成的物理轨迹但突发人身危险或关节机械卡死时（情境），我想要端侧安全拦截引擎立刻执行最高优先级的物理急停（ESTOP）并切换至阻抗软化模式（动机），以便保护周边人类安全并防止机器人自身电机烧毁（结果）。

**设计/图纸链接**：[D:/embodied-taskflow/docs/system_design/SYS-002-safety-rules-and-data-flywheel.md](file:///D:/embodied-taskflow/docs/system_design/SYS-002-safety-rules-and-data-flywheel.md) 状态转移与 ESTOP 规则。

**验收标准**：
1. **时延上限 (ESTOP Latency)**：从端侧传感器检测到违规输入（如 SEC-001 人类闯入 0.3 米、SEC-003 电机电流过载 150%），到控制器给电机下达制动及阻抗软化指令，全链路处理时延 $\le 20\text{ 毫秒}$。
2. **物理顺从控制 (Compliance Mode)**：ESTOP 触发后，严禁采取抱死制动（容易挫伤人手或打坏减速箱齿轮），系统必须切换至“重力补偿+低阻尼”的关节阻抗控制，使得人类可以用少于 $10\text{ N}$ 的外力轻松推开机器人手臂。
3. **声光警报与日志快照**：急停触发瞬间，机器人头部 LED 状态灯必须切换为红色快闪状态，发出警告音，同时将触发前 3 秒及后 1 秒的所有时序传感器数据（扭矩、点云、关节位置）打包写入安全事件快照中。

---

### 2.2 工作故事二：人工在环控制接管 (Teleop Override)

**标题**：云端遥控接管与无缝平滑切换

**描述**：当机器人在非结构化环境中任务执行失败或被安全拦截需要人工纠偏时（情境），我想要云端操作员能够通过低延迟接管控制通道进行点对点控制（动机），以便帮助机器人脱困并平稳恢复自动作业（结果）。

**设计/图纸链接**：[D:/embodied-taskflow/docs/system_design/SYS-001-architecture-spec.md](file:///D:/embodied-taskflow/docs/system_design/SYS-001-architecture-spec.md) 时序图及遥测接口。

**验收标准**：
1. **视频流时延与控制链路 (WebRTC Latency)**：机器人相机捕捉到的 RGB-D 视频流通过 WebRTC 压缩中继到云端看板，画面端到端时延 $\le 150\text{ 毫秒}$。云端手柄控制指令传输时延 $\le 50\text{ 毫秒}$。
2. **接管提示与 3D 可视化辅助**：操作员接管界面需叠加显示机器人机械臂的 3D 物理碰撞包围盒（Collison Geometry）与障碍物点云重合度，当距离低于安全间距时，界面应提供红色高亮视觉反馈。
3. **控制权交接平滑度 (Control Handover Smoothing)**：
   - 切换进入：手柄推力必须设定 $2.0\text{ N}$ 触发死区，防止误触导致机器人手臂猛烈抖动。
   - 切换退出：操作员释放控制权时，机器人当前关节位置自动更新为新轨迹的起点（Pose Alignment），在 500 毫秒内以一阶低通滤波方式平滑过渡回自动轨迹，最大速度突变 $\le 0.05\text{ m/s}$。
