import sys
import os
import json
import pytest
from fastapi.testclient import TestClient

# 确保能找到 backend 目录下的 main.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # 确保你的 FastAPI 实例变量名叫 app

client = TestClient(app)

def load_cases():
    file_path = os.path.join(os.path.dirname(__file__), "test_cases.json")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.mark.parametrize("case", load_cases())
def test_brew_parsing_endpoint(case):
    """
    核心测试函数：模拟前端发送 POST 请求并校验解析字段
    """
    print(f"\n执行测试用例: {case['description']}")
    
    # 构造请求体，需与你的 SaveBrewRequest 或类似的解析接口一致
    # 假设你的解析路由是 /api/parse (请根据实际修改)
    payload = {
        "raw_input": case["input"],
        "input_type": "text"
    }
    
    response = client.post("/api/v1/brew/parse", json=payload)
    
    # 断言：HTTP 状态码必须是 200
    assert response.status_code == 200, f"请求失败: {response.text}"
    
    data = response.json()
    assert data["success"] is True, "后端返回 success 为 False"
    
    parsed = data["parsed"]
    expected = case["expected"]

    for field, expected_val in expected.items():
        actual_val = parsed.get(field)
        
        if isinstance(expected_val, float):
            # 浮点数用近似比较
            assert actual_val == pytest.approx(expected_val, abs=0.5), \
                f"字段 {field} 误差过大！预期: {expected_val}, 实际: {actual_val}"
        elif isinstance(expected_val, str):
            # 字符串用包含检查（双向）
            assert expected_val in str(actual_val) or str(actual_val) in expected_val, \
                f"字段 {field} 解析错误！预期包含: {expected_val}, 实际: {actual_val}"
        else:
            # 其他类型直接相等比较
            assert actual_val == expected_val, \
                f"字段 {field} 解析错误！预期: {expected_val}, 实际: {actual_val}"
    print(f"✅ {case['id']} 测试通过")