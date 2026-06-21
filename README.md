# Embodied-TaskFlow

> **具身智能任务规划与多模态安全评估系统**  
> An Enterprise-Grade Task Planning & Multi-Modal Safety Evaluation Platform for Mobile Manipulator and Humanoid Robots.

---

## 项目愿景 (Vision)

**Embodied-TaskFlow** 旨在解决具身智能（Embodied AI）机器人在非结构化、人机共存环境（如智能家庭、仓储物流）中，**“高层语义任务规划（High-level Task Planning）”**与**“底层动作安全执行（Low-level Action Control）”**之间的断层问题。

本项目通过端云协同架构，构建一套完整的任务分发、行为树（Behavior Tree）转换、安全策略拦截与多模态评测系统，展示工业级具身智能算法落地与数据闭环的产品体系。

---

## 目录结构 (Directory Structure)

项目遵循标准的工业级开源软件与文档规范：

```txt
embodied-taskflow/
├── README.md               # 项目主说明文档
├── docs/                   # 产品、架构与技术设计文档
│   ├── prd/                # 产品需求文档 (Product Requirements Documents)
│   │   └── PRD-001-embodied-task-planning.md  # 任务规划核心 PRD
│   ├── system_design/      # 系统架构与 API 接口说明
│   └── evaluation/         # 评测标准与 Benchmark 数据集说明
├── src/                    # 源代码目录 (未来阶段实现)
│   ├── planner/            # 基于大语言模型与 VLM 的任务拆解器
│   ├── safety_engine/      # 物理安全规则拦截与状态检测引擎
│   ├── simulator/          # Web 2D 可视化仿真沙盒
│   └── dashboard/          # PM 数据分析与人工干预 (HITL) 看板
└── tests/                  # 单元测试与集成评测用例
```

---

## 开发路线图 (Roadmap)

- **Phase 1: 产品定义与系统建模 (当前阶段)**
  - [x] 初始化项目目录与基础框架文档
  - [ ] 完成任务规划系统核心 PRD 撰写 (`PRD-001`)
  - [ ] 定义系统架构、数据流向及 API 规范
- **Phase 2: 核心规划引擎与安全策略实现**
  - [ ] 开发基于大模型 API 的任务拆解模块（LLM Planner）
  - [ ] 编写基于规则与置信度的物理安全拦截器（Safety Interceptor）
- **Phase 3: 仿真模拟与 PM 看板构建**
  - [ ] 实现 Web 2D 可视化仿真沙盒，模拟环境物理变化
  - [ ] 搭建 PM 评测数据仪表盘，支持 Session 坏案标记与人工干预（HITL）

---

## 快速开始 (Quick Start)

> [!NOTE]
> 当前项目正处于 **Phase 1 (产品定义与方案评审)** 阶段。
> 核心产品需求文档与系统架构设计已归档在 `docs/` 目录下。

### 1. 阅读产品文档
请前往 [PRD-001-embodied-task-planning.md](docs/prd/PRD-001-embodied-task-planning.md) 了解系统核心需求及安全机制设计。

### 2. 本地预览文档
建议使用支持 Markdown 实时渲染的编辑器（如 VS Code / Cursor）预览文档以获得最佳排版效果。
