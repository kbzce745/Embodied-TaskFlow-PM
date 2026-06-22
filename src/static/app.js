// 全局状态管理
let currentSessionId = "";
let currentInstruction = "";
let currentTree = null;
let currentNodeId = "";
let executionQueue = [];
let executionHistory = [];
let isExecuting = false;
let systemStatus = "IDLE"; // IDLE, EXECUTING, ESTOP_TRIGGERED, TELEOP_OVERRIDE

// 仿真物理对象
const robot = {
    x: 80,
    y: 320,
    targetX: 80,
    targetY: 320,
    radius: 20,
    angle: 0,
    leftArmAngle: -0.5,
    rightArmAngle: 0.5,
    carryObject: null
};

// 环境目标位置坐标
const LOCATIONS = {
    dock: { x: 80, y: 320, label: "充电桩" },
    table: { x: 240, y: 220, label: "客房桌面" },
    kitchen: { x: 380, y: 120, label: "厨房水槽" }
};

// Canvas 渲染配置
const canvas = document.getElementById("robot-canvas");
const ctx = canvas.getContext("2d");

// 初始化 Chart.js 历史监控图表
let mtboChartInstance = null;
function initMetricsCharts() {
    const chartCtx = document.getElementById("mtbo-chart").getContext("2d");
    
    // 设置渐变背景
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 100);
    gradient.addColorStop(0, "rgba(6, 182, 212, 0.3)");
    gradient.addColorStop(1, "rgba(6, 182, 212, 0)");

    mtboChartInstance = new Chart(chartCtx, {
        type: "line",
        data: {
            labels: ["06-16", "06-17", "06-18", "06-19", "06-20", "06-21"],
            datasets: [{
                label: "MTBO 趋势 (小时)",
                data: [5.2, 5.8, 6.1, 7.0, 7.5, 8.5],
                borderColor: "#06b6d4",
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointBackgroundColor: "#06b6d4"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#9ca3af", font: { size: 9 } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#9ca3af", font: { size: 9 } }
                }
            }
        }
    });
}

// 模拟雷达扫描光栅与机器人绘制循环
function drawSimulationLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. 绘制房间区域网格与目标物
    drawStaticEnvironment();
    
    // 2. 绘制传感器模拟状态 (人类或障碍物点云)
    const humanSwitch = document.getElementById("human-switch").checked;
    if (humanSwitch) {
        drawObstacleHuman();
    }
    
    // 3. 驱动机器人平滑物理位移
    updateRobotPosition();
    
    // 4. 绘制机器人本体、雷达扫描区及双臂
    drawRobot(humanSwitch);
    
    requestAnimationFrame(drawSimulationLoop);
}

function drawStaticEnvironment() {
    // 绘制地板网格线
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // 绘制目标工作区圆圈与标识
    Object.keys(LOCATIONS).forEach(key => {
        const loc = LOCATIONS[key];
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#9ca3af";
        ctx.font = "11px 'Inter'";
        ctx.textAlign = "center";
        ctx.fillText(loc.label, loc.x, loc.y + 45);
    });

    // 在客厅桌上额外绘制一个“脏水杯”
    if (!robot.carryObject) {
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(LOCATIONS.table.x, LOCATIONS.table.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawObstacleHuman() {
    // 模拟在通道中心出现的动态人影障碍物
    const hX = 220;
    const hY = 280;
    
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 1;
    
    // 绘制人员危险避障区边界
    ctx.beginPath();
    ctx.arc(hX, hY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 绘制人影中心红点
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(hX, hY, 8, 0, Math.PI * 2);
    ctx.fill();
}

function updateRobotPosition() {
    if (systemStatus === "ESTOP_TRIGGERED") return;
    
    const dx = robot.targetX - robot.x;
    const dy = robot.targetY - robot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
        robot.angle = Math.atan2(dy, dx);
        // 自适应平滑移动
        robot.x += (dx / dist) * 2.2;
        robot.y += (dy / dist) * 2.2;
        
        // 移动中手臂产生微幅摆动
        robot.leftArmAngle = -0.4 + Math.sin(Date.now() / 150) * 0.15;
        robot.rightArmAngle = 0.4 + Math.cos(Date.now() / 150) * 0.15;
    } else {
        robot.x = robot.targetX;
        robot.y = robot.targetY;
    }
}

function drawRobot(humanActive) {
    // 1. 绘制雷达扫描范围 (雷达光束扇形扫描)
    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.angle);
    
    const scanAngle = 1.0; // 弧度范围
    const scanLen = humanActive ? 120 : 150;
    
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, scanLen);
    if (systemStatus === "ESTOP_TRIGGERED") {
        grad.addColorStop(0, "rgba(239, 68, 68, 0.25)");
        grad.addColorStop(1, "rgba(239, 68, 68, 0)");
    } else {
        grad.addColorStop(0, "rgba(6, 182, 212, 0.15)");
        grad.addColorStop(1, "rgba(6, 182, 212, 0)");
    }
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, scanLen, -scanAngle/2, scanAngle/2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. 绘制机器人双臂及持握物件
    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.angle);
    
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    
    // 左臂
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(Math.cos(robot.leftArmAngle) * 22, -12 + Math.sin(robot.leftArmAngle) * 22);
    ctx.stroke();
    
    // 右臂
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(Math.cos(robot.rightArmAngle) * 22, 12 + Math.sin(robot.rightArmAngle) * 22);
    ctx.stroke();
    
    // 如果持有物体，将其绘制在双臂汇聚前端
    if (robot.carryObject) {
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(22, 0, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 3. 绘制机器人底盘主体
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = systemStatus === "ESTOP_TRIGGERED" ? "#ef4444" : "#06b6d4";
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(robot.x, robot.y, robot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 绘制车前方向箭头
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(robot.x + Math.cos(robot.angle) * 12, robot.y + Math.sin(robot.angle) * 12, 3, 0, Math.PI * 2);
    ctx.fill();
}

// 行为树渲染引擎 (递归生成 DOM)
function renderBehaviorTree(node) {
    const nodeDiv = document.createElement("div");
    nodeDiv.className = `bt-node ${node.node_id === "root_0" ? "root" : ""}`;
    nodeDiv.id = `bt-node-${node.node_id}`;
    
    const contentSpan = document.createElement("span");
    contentSpan.className = `node-content ${node.type.toLowerCase()}`;
    
    // 类型标签缩写
    let typeTag = "";
    if (node.type === "Sequence") typeTag = "SEQ";
    else if (node.type === "Selector") typeTag = "SEL";
    else if (node.type === "ActionNode") typeTag = "ACT";
    else if (node.type === "ConditionNode") typeTag = "COND";
    
    contentSpan.innerHTML = `<span class="node-type-tag">${typeTag}</span> ${node.label}`;
    nodeDiv.appendChild(contentSpan);
    
    if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "node-children";
        node.children.forEach(child => {
            childrenContainer.appendChild(renderBehaviorTree(child));
        });
        nodeDiv.appendChild(childrenContainer);
    }
    
    return nodeDiv;
}

// 更新系统全局状态指示灯
function updateSystemStatus(status, text) {
    systemStatus = status;
    const pulseDot = document.getElementById("system-pulse");
    const statusLabel = document.getElementById("system-status-text");
    
    pulseDot.className = "pulse-dot " + status.toLowerCase().replace("_", "");
    statusLabel.textContent = text;
}

// 模拟传感器高频数据收集
function getSensorSnapshot() {
    const isTempActive = document.getElementById("temp-switch").checked;
    const isHumanActive = document.getElementById("human-switch").checked;
    
    return {
        // 动态模拟阻抗反馈与雷达数据
        liquid_temperature: isTempActive ? 68.0 : 22.0,
        human_distance: isHumanActive ? 0.22 : 2.5,
        battery_level: 0.88,
        collision_force: 0.1
    };
}

// 启动并模拟执行行为树动作队列
async function runExecutor() {
    isExecuting = true;
    updateSystemStatus("RUNNING", "执行行为树任务中");
    
    while (executionQueue.length > 0 && systemStatus === "RUNNING") {
        const step = executionQueue[0];
        currentNodeId = step.node_id;
        
        // 1. 高频前置安全过滤策略，发起验证调用
        const sensorData = getSensorSnapshot();
        const verifyRes = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                node_label: step.label,
                parameters: step.parameters,
                sensor_data: sensorData
            })
        }).then(res => res.json());
        
        const nodeEl = document.getElementById(`bt-node-${step.node_id}`);
        const contentEl = nodeEl ? nodeEl.querySelector(".node-content") : null;
        
        if (verifyRes.status === "ESTOP") {
            // 触发安全拦截机制
            if (contentEl) contentEl.className = "node-content " + step.type.toLowerCase() + " failure";
            handleEstop(verifyRes);
            break;
        }
        
        // 2. 无安全威胁，节点进入 RUNNING 状态
        if (contentEl) contentEl.className = "node-content " + step.type.toLowerCase() + " running";
        
        // 3. 执行特定节点的物理动作移动指令模拟
        await simulatePhysicalAction(step);
        
        if (systemStatus !== "RUNNING") break;
        
        // 4. 动作顺利结束，标为 SUCCESS 并弹出队列
        if (contentEl) contentEl.className = "node-content " + step.type.toLowerCase() + " success";
        executionHistory.push({
            ...step,
            sensor_data: sensorData,
            status: "SUCCESS"
        });
        executionQueue.shift();
    }
    
    if (executionQueue.length === 0 && systemStatus === "RUNNING") {
        updateSystemStatus("IDLE", "系统就绪 (IDLE)");
        isExecuting = false;
        robot.targetX = LOCATIONS.dock.x;
        robot.targetY = LOCATIONS.dock.y;
    }
}

// 模拟机器人 Canvas 运动控制延时
async function simulatePhysicalAction(step) {
    if (step.node_id === "act_pick_cup" || step.node_id === "act_pick_coffee") {
        // 抓取物体动作：移动到桌子，抓紧爪子
        robot.targetX = LOCATIONS.table.x;
        robot.targetY = LOCATIONS.table.y;
        await sleep(2000);
        robot.carryObject = "cup";
    } else if (step.node_id === "act_nav_kitchen") {
        // 导航至厨房
        robot.targetX = LOCATIONS.kitchen.x;
        robot.targetY = LOCATIONS.kitchen.y;
        await sleep(3000);
    } else if (step.node_id === "act_place_sink") {
        // 放下物体至水槽
        await sleep(1500);
        robot.carryObject = null;
    } else {
        // 其他判断或轻微动作延迟
        await sleep(1000);
    }
}

// 触发安全急停控制逻辑
function handleEstop(estopDetail) {
    updateSystemStatus("ESTOP_TRIGGERED", "ESTOP 触发: " + estopDetail.description);
    
    // 开启全屏闪烁警示遮罩
    document.getElementById("estop-overlay").style.display = "flex";
    document.getElementById("overlay-reason").textContent = estopDetail.description;
    
    const rawData = estopDetail.raw_data || {};
    
    // 记录触发急停时的整套时序状态用于打标
    executionHistory.push({
        node_id: currentNodeId,
        label: rawData.failed_node || "MANUAL_ESTOP",
        status: "ESTOP_INTERCEPTED",
        parameters: rawData.parameters || {},
        sensor_data: rawData.sensor_snapshot || getSensorSnapshot()
    });
    
    // 启用接管与坏案导出操作
    document.getElementById("release-btn").disabled = false;
    document.getElementById("export-badcase-btn").disabled = false;
    isExecuting = false;
}

// 手工接管方向键微移模拟
function triggerTeleop(direction) {
    if (systemStatus !== "ESTOP_TRIGGERED" && systemStatus !== "TELEOP_OVERRIDE") {
        updateSystemStatus("TELEOP_OVERRIDE", "人工遥控接管中 (TELEOP)");
    }
    
    const step = 8;
    if (direction === "up") robot.targetY -= step;
    else if (direction === "down") robot.targetY += step;
    else if (direction === "left") robot.targetX -= step;
    else if (direction === "right") robot.targetX += step;
}

// 释放急停锁定
function releaseSafetyLock() {
    document.getElementById("estop-overlay").style.display = "none";
    document.getElementById("release-btn").disabled = true;
    
    // 机器人返回原位
    updateSystemStatus("IDLE", "安全锁定解除，系统就绪");
    isExecuting = false;
    executionQueue = [];
    
    // 复位传感器模拟开关
    document.getElementById("human-switch").checked = false;
    document.getElementById("temp-switch").checked = false;
}

// 导出 PM 坏案 JSONL 数据包
async function exportBadcase() {
    const reasonSelect = document.getElementById("badcase-reason");
    const badcasePayload = {
        session_id: currentSessionId,
        raw_instruction: currentInstruction,
        execution_result: systemStatus === "ESTOP_TRIGGERED" ? "FAILED_BY_ESTOP" : "EXECUTION_INCIDENT",
        failure_reason: {
            reason_type: reasonSelect.value,
            reason_text: reasonSelect.options[reasonSelect.selectedIndex].text
        },
        trajectory_history: executionHistory
    };
    
    const res = await fetch("/api/badcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badcasePayload)
    }).then(res => res.json());
    
    if (res.status === "SAVED") {
        alert("坏案已标注并成功追加写入后端日志文件：\n" + res.filepath);
        document.getElementById("export-badcase-btn").disabled = true;
    }
}

// API 行为树生成核心调用
async function sendTaskInstruction() {
    const inputVal = document.getElementById("task-input").value.trim();
    if (!inputVal) return;
    
    currentInstruction = inputVal;
    currentSessionId = "sess_" + Date.now();
    executionQueue = [];
    executionHistory = [];
    robot.carryObject = null;
    robot.x = LOCATIONS.dock.x;
    robot.y = LOCATIONS.dock.y;
    
    const viewport = document.getElementById("tree-viewport");
    viewport.innerHTML = '<div class="empty-state">正在联络大模型进行高层任务拆解中...</div>';
    
    const payload = {
        session_id: currentSessionId,
        instruction: currentInstruction,
        perception_context: {
            objects: [{ label: "dirty_cup", confidence: 0.95, bbox_3d: [2.2, 0.4, 0.8, 0.1, 0.1, 0.15] }],
            obstacle_grid_map: "local_grid_data"
        }
    };
    
    try {
        const res = await fetch("/api/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(res => res.json());
        
        if (res.status === "SUCCESS") {
            currentTree = res.root_node;
            viewport.innerHTML = "";
            viewport.appendChild(renderBehaviorTree(currentTree));
            
            // 启用坏案标注按钮，允许PM随时进行归档
            document.getElementById("export-badcase-btn").disabled = false;
            
            // 组装动作队列
            extractActionQueue(currentTree);
            
            // 延迟一秒自动启动执行
            setTimeout(runExecutor, 1000);
        } else {
            viewport.innerHTML = `<div class="empty-state" style="color:#ef4444">规划失败：${res.status}</div>`;
            document.getElementById("export-badcase-btn").disabled = false;
        }
    } catch (e) {
        viewport.innerHTML = `<div class="empty-state" style="color:#ef4444">网络通信故障: ${e.message}</div>`;
        document.getElementById("export-badcase-btn").disabled = false;
    }
}

// 递归深度优先提取需要执行的 Action 节点
function extractActionQueue(node) {
    if (node.type === "ActionNode" || node.type === "ConditionNode") {
        executionQueue.push(node);
    }
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => extractActionQueue(child));
    }
}

// 延时辅助器
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 绑定操作台交互事件
function bindUIEvents() {
    document.getElementById("send-task-btn").addEventListener("click", sendTaskInstruction);
    document.getElementById("reset-scene-btn").addEventListener("click", () => {
        robot.x = LOCATIONS.dock.x;
        robot.y = LOCATIONS.dock.y;
        robot.targetX = LOCATIONS.dock.x;
        robot.targetY = LOCATIONS.dock.y;
        robot.carryObject = null;
        releaseSafetyLock();
    });
    
    document.getElementById("release-btn").addEventListener("click", releaseSafetyLock);
    document.getElementById("export-badcase-btn").addEventListener("click", exportBadcase);
    document.getElementById("estop-btn").addEventListener("click", () => {
        handleEstop({ description: "操作员手动强制触发 ESTOP 安全急停" });
    });
    
    // 遥控器方向键事件绑定
    const directions = ["up", "down", "left", "right"];
    directions.forEach(dir => {
        document.getElementById(`btn-teleop-${dir}`).addEventListener("mousedown", () => triggerTeleop(dir));
    });
}

// 初始化运行入口
window.addEventListener("DOMContentLoaded", () => {
    initMetricsCharts();
    bindUIEvents();
    drawSimulationLoop();
});
