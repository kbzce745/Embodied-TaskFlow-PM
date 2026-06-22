from typing import Dict, Any, List

class SafetyException(Exception):
    """安全规则触发拦截导致的急停故障异常 (ESTOP)"""
    def __init__(self, event_code: str, description: str, raw_data: Dict[str, Any]):
        super().__init__(f"[{event_code}] ESTOP Triggered: {description}")
        self.event_code = event_code
        self.description = description
        self.raw_data = raw_data

class SafetyRule:
    """物理安全监测规则基类"""
    def __init__(self, event_code: str, description: str):
        self.event_code = event_code
        self.description = description

    def check(self, parameters: Dict[str, Any], sensor_data: Dict[str, Any]) -> bool:
        """评估传感器状态是否满足安全拦截标准，若拦截返回 True"""
        raise NotImplementedError("Must implement safety rule validation check")

class HumanClosenessRule(SafetyRule):
    """SEC-001: 障碍物/活体接近防御拦截"""
    def __init__(self):
        super().__init__("SEC-001", "检测到机器人运动路径 0.3 米内存在活体/人类")

    def check(self, parameters: Dict[str, Any], sensor_data: Dict[str, Any]) -> bool:
        human_distance = sensor_data.get("human_distance", 999.0)
        if human_distance < 0.3:
            return True
        return False

class HotLiquidHandlingRule(SafetyRule):
    """SEC-004: 高温接触/搬运拦截"""
    def __init__(self):
        super().__init__("SEC-004", "检测到搬运液体温度过高，超出安全持握限制")

    def check(self, parameters: Dict[str, Any], sensor_data: Dict[str, Any]) -> bool:
        # 当正在执行与抓取咖啡或热液体相关的参数校验时
        target_temp = sensor_data.get("liquid_temperature", 0.0)
        max_allowed = parameters.get("max_allowed_temp", 50.0)
        
        # 传感器实际读数超出允许的最大安全握持温度限制
        if target_temp > max_allowed:
            return True
        return False

class SafetyInterceptor:
    """端侧高频运行的安全策略引擎"""
    def __init__(self):
        self.rules: List[SafetyRule] = []
        # 默认加载硬编码标准安全规则库
        self.register_rule(HumanClosenessRule())
        self.register_rule(HotLiquidHandlingRule())

    def register_rule(self, rule: SafetyRule):
        self.rules.append(rule)

    def verify_action(self, node_label: str, parameters: Optional[Dict[str, Any]], sensor_data: Dict[str, Any]):
        """在行为树 Tick 执行每一个具体动作前进行策略核对"""
        if not parameters:
            parameters = {}
            
        for rule in self.rules:
            if rule.check(parameters, sensor_data):
                # 匹配拦截规则，抛出 ESTOP 异常阻止动作下发
                raise SafetyException(
                    event_code=rule.event_code,
                    description=rule.description,
                    raw_data={
                        "failed_node": node_label,
                        "parameters": parameters,
                        "sensor_snapshot": sensor_data
                    }
                )
