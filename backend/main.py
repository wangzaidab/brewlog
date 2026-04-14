"""
BrewLog 后端 - 主文件
用 FastAPI 构建 API，调用 DeepSeek 做自然语言解析
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime, date
import os
import json

# 读取 .env 文件中的环境变量
load_dotenv(dotenv_path="../.env")

# 初始化 FastAPI 应用
app = FastAPI(
    title="BrewLog API",
    description="说一句话，记一杯咖啡",
    version="0.1.0"
)

# CORS 配置：允许前端访问后端
# 开发时前端跑在 localhost:5173，需要允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # 本地开发
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],             # 允许所有 HTTP 方法
    allow_headers=["*"],             # 允许所有请求头
)

# 初始化 DeepSeek 客户端（使用 OpenAI 兼容接口）
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)


# ============================================
# 数据模型（定义请求和响应的数据结构）
# ============================================

class ParseRequest(BaseModel):
    """解析请求：用户输入的原始文本"""
    raw_input: str
    input_type: str = "text"  # "text" 或 "voice"


class ParsedBrew(BaseModel):
    """解析结果：AI 提取出的结构化数据"""
    bean_name: str | None = None
    origin: str | None = None
    process_method: str | None = None
    roast_level: str | None = None
    roast_date: str | None = None
    rest_days: int | None = None
    brew_method: str | None = None
    dose_g: float | None = None
    water_amount_g: float | None = None
    liquid_out_g: float | None = None
    brew_ratio: str | None = None
    water_temp_c: float | None = None
    grind_size: str | None = None
    brew_time: str | None = None
    water_brand: str | None = None
    water_category: str | None = None
    water_tds: str | None = None
    flavor_raw: list[str] | None = None
    flavor_tags: list[str] | None = None
    flavor_note: str | None = None
    rating: float | None = None
    notes: str | None = None


class ParseResponse(BaseModel):
    """解析接口的完整响应"""
    success: bool
    parsed: ParsedBrew | None = None
    missing_fields: list[str] = []
    notifications: list[dict] = []
    error: str | None = None


# ============================================
# DeepSeek 解析 Prompt
# ============================================

PARSE_SYSTEM_PROMPT = """你是 BrewLog 的智能解析引擎。用户会用自然语言描述一次咖啡冲煮体验，你需要从中提取结构化数据。

## 你需要提取的字段

1. bean_name: 豆种名称（如"肯尼亚 AA"、"耶加雪菲"）
2. origin: 产地（如"肯尼亚"、"埃塞俄比亚"）
3. process_method: 处理法（水洗/日晒/蜜处理/厌氧/湿刨法等）
4. roast_level: 烘焙度（浅烘/中烘/中深/深烘）
5. roast_date: 烘焙日期（ISO格式 YYYY-MM-DD。如果用户说"上周三"、"三天前"等相对时间，请根据今天的日期推算出具体日期）
6. brew_method: 冲煮方式（如"V60 三段式"、"摩卡壶"、"法压壶"）
7. dose_g: 粉重，单位克
8. water_amount_g: 注水量，单位克
9. liquid_out_g: 出液量，单位克
10. water_temp_c: 水温，单位摄氏度
11. grind_size: 研磨度（保留用户原始表述，如"C40第22格"、"中细"）
12. brew_time: 冲煮时间
13. water_brand: 水质品牌
14. water_category: 水质分类（根据以下规则）
15. water_tds: TDS 范围描述（根据以下规则）
16. flavor_raw: 用户描述风味的原话（数组，保留原始表达）
17. flavor_tags: 标准风味标签（数组，映射到 SCA 风味轮体系）
18. flavor_note: 风味翻译说明（1-2句话，语气友好不说教，像一个温和的咖啡师朋友）
19. rating: 用户的评分（1-10）
20. notes: 无法归类到以上字段的其他信息

## 水质分类规则

| 用户表述 | water_brand | water_category | water_tds |
|---------|-------------|----------------|-----------|
| 农夫山泉 | 农夫山泉 | 天然矿泉水 | 中等(~120) |
| 怡宝 | 怡宝 | 纯净水 | 极低(~0) |
| 怡宝+Aquacode 或类似调配 | 怡宝+Aquacode调配 | 定制矿物质水 | 定制 |
| 百岁山 | 百岁山 | 天然矿泉水 | 较高(~170) |
| 屈臣氏蒸馏水 | 屈臣氏 | 蒸馏水 | 极低(~0) |
| 自来水/过滤水 | 自来水(过滤) | 过滤水 | 未知 |
| 其他品牌 | 保留用户表述 | 瓶装水 | 未知 |

## 风味翻译规则

将用户的口语化风味描述映射到 SCA 咖啡风味轮的标准分类：

- 大分类：花香、水果、酸质、甜感、坚果/可可、焦糖化、香料、谷物、烘烤、其他
- 用户说"像蓝莓"→ flavor_tags 里写"蓝莓"，属于"水果"大类
- 用户说"烤地瓜味"→ flavor_tags 里写"焦糖化/烤红薯"，属于"焦糖化"大类
- 用户说"有点苦但挺香"→ 根据上下文判断，可能是"可可"或"深烘焦糖"

风味翻译说明（flavor_note）的语气要求：
- 不纠正用户，而是"翻译+共情"
- 当用户描述精准时给予肯定
- 示例："你说的'蓝莓感'在杯测中属于'明亮果酸'类，这正是浅烘水洗肯尼亚的招牌特征，说明萃取得很到位。"

## 重要规则

1. 用户没有提及的字段，设为 null，不要猜测
2. 今天的日期是 {today}，用于推算相对日期
3. 如果粉重和注水量都有，自动计算粉水比（brew_ratio），格式为"1:X"（保留一位小数）
4. 如果有烘焙日期，自动计算养豆天数（rest_days = 今天 - 烘焙日期）
5. flavor_raw 保留用户的原始表达，flavor_tags 映射到标准风味词
6. 始终返回合法的 JSON，不要有多余的解释文字

## 输出格式

请严格返回以下 JSON 格式，不要包含任何其他文字：

{{
    "bean_name": "...",
    "origin": "...",
    "process_method": "...",
    "roast_level": "...",
    "roast_date": "YYYY-MM-DD 或 null",
    "rest_days": 数字或null,
    "brew_method": "...",
    "dose_g": 数字或null,
    "water_amount_g": 数字或null,
    "liquid_out_g": 数字或null,
    "brew_ratio": "1:X" 或 null,
    "water_temp_c": 数字或null,
    "grind_size": "...",
    "brew_time": "...",
    "water_brand": "...",
    "water_category": "...",
    "water_tds": "...",
    "flavor_raw": ["用户原话1", "用户原话2"],
    "flavor_tags": ["标准标签1", "标准标签2"],
    "flavor_note": "风味翻译说明...",
    "rating": 数字或null,
    "notes": "..."
}}"""


# ============================================
# 智能提示规则引擎
# ============================================

def check_notifications(parsed: ParsedBrew) -> list[dict]:
    """
    检查解析结果，触发相应的智能提示。
    这些都是 if 语句，不调用 AI，零成本。
    """
    notifications = []
    
    # 提示 #1: 养豆天数提醒
    if parsed.rest_days is not None:
        if parsed.rest_days < 7:
            notifications.append({
                "type": "rest_days_short",
                "message": f"这批豆子才养了{parsed.rest_days}天，风味可能还没完全打开，过几天再冲一杯对比看看？"
            })
        elif parsed.rest_days > 60:
            notifications.append({
                "type": "rest_days_long",
                "message": f"这批豆子烘焙已经{parsed.rest_days}天了，风味可能有所衰减，如果觉得味道变平了这可能是原因。"
            })
    
    # 提示 #2: 水温异常提示
    if parsed.water_temp_c is not None and parsed.roast_level is not None:
        roast = parsed.roast_level
        temp = parsed.water_temp_c
        if "浅" in roast and temp < 88:
            notifications.append({
                "type": "temp_low_for_light",
                "message": f"浅烘豆配{temp}℃可能会萃取不足，容易出现尖酸感。试试提高到90-93℃？"
            })
        elif "深" in roast and temp > 93:
            notifications.append({
                "type": "temp_high_for_dark",
                "message": f"深烘豆配{temp}℃可能会过萃，容易出苦涩。试试降温？"
            })
        elif temp < 85 or temp > 96:
            notifications.append({
                "type": "temp_unusual",
                "message": f"水温{temp}℃偏离常规范围，确认一下是否记录正确？"
            })
    
    # 提示 #3: 粉水比异常提示
    if parsed.brew_ratio is not None:
        try:
            ratio_str = parsed.brew_ratio.replace("1:", "")
            ratio_value = float(ratio_str)
            if ratio_value < 12:
                notifications.append({
                    "type": "ratio_too_strong",
                    "message": f"粉水比{parsed.brew_ratio}偏浓，确认一下注水量是否正确？"
                })
            elif ratio_value > 18:
                notifications.append({
                    "type": "ratio_too_weak",
                    "message": f"粉水比{parsed.brew_ratio}偏稀，确认一下粉重是否正确？"
                })
        except (ValueError, AttributeError):
            pass
    
    # 提示 #4: 研磨度与冲煮方式不匹配
    if parsed.grind_size is not None and parsed.brew_method is not None:
        grind = parsed.grind_size.lower()
        method = parsed.brew_method.lower()
        
        if any(m in method for m in ["摩卡", "意式", "espresso"]):
            if any(g in grind for g in ["粗", "中粗"]):
                notifications.append({
                    "type": "grind_mismatch",
                    "message": "摩卡壶/意式通常用较细的研磨度，确认一下研磨设置？"
                })
        elif any(m in method for m in ["法压", "french press"]):
            if any(g in grind for g in ["细", "极细"]):
                notifications.append({
                    "type": "grind_mismatch",
                    "message": "法压壶通常用较粗的研磨度，太细可能会过萃且不好压。"
                })
    
    # 提示 #5: 评分偏低时的鼓励
    if parsed.rating is not None and parsed.rating <= 5:
        import random
        encouragements = [
            "冲煮实验本来就是试错的过程，记录下来就是进步。",
            "每一杯'不太好'的记录，都在帮你更接近完美的那一杯。",
            "就算是世界冠军也有翻车的时候，别太在意。",
            "数据记下来了，下一杯调整就有方向了。",
            "不好喝也是有价值的数据——至少你知道这组参数不太行了。",
        ]
        notifications.append({
            "type": "low_score_encouragement",
            "message": random.choice(encouragements)
        })
    
    return notifications


# ============================================
# API 接口
# ============================================

@app.get("/")
def root():
    """根路径，确认 API 在运行"""
    return {"message": "BrewLog API is running", "version": "0.1.0"}


@app.post("/api/v1/brew/parse", response_model=ParseResponse)
async def parse_brew(request: ParseRequest):
    """
    核心接口：解析用户的自然语言冲煮描述
    
    接收用户输入的文字（或语音转文字的结果），
    调用 DeepSeek 提取结构化的冲煮参数和风味信息。
    """
    
    # 检查输入不能为空
    if not request.raw_input.strip():
        raise HTTPException(status_code=400, detail="输入不能为空")
    
    try:
        # 把今天的日期注入 Prompt，用于推算相对日期
        today = date.today().isoformat()
        system_prompt = PARSE_SYSTEM_PROMPT.replace("{today}", today)
        
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.raw_input}
            ],
            temperature=0.1,  # 低温度 = 更稳定的输出，减少随机性
            max_tokens=2000,
            response_format={"type": "json_object"}  # 强制返回 JSON
        )
        
        # 提取 AI 返回的文本
        result_text = response.choices[0].message.content
        
        # 解析 JSON
        parsed_data = json.loads(result_text)
        
        # 构建 ParsedBrew 对象
        parsed = ParsedBrew(**parsed_data)
        # 用代码计算粉水比（比 AI 算更准确）
        if parsed.dose_g and parsed.water_amount_g and parsed.dose_g > 0:
            ratio = round(parsed.water_amount_g / parsed.dose_g, 1)
            parsed.brew_ratio = f"1:{ratio}"
        
        # 用代码计算养豆天数（比 AI 算更准确）
        if parsed.roast_date:
            try:
                roast = date.fromisoformat(parsed.roast_date)
                parsed.rest_days = (date.today() - roast).days
            except ValueError:
                pass
        # 找出用户没提及的字段（AI 返回 null 的）
        missing = []
        important_fields = {
            "bean_name": "豆种",
            "roast_level": "烘焙度",
            "brew_method": "冲煮方式",
            "dose_g": "粉重",
            "water_amount_g": "注水量",
            "water_temp_c": "水温",
            "grind_size": "研磨度",
            "rating": "评分",
        }
        for field, label in important_fields.items():
            if getattr(parsed, field) is None:
                missing.append(label)
        
        # 运行智能提示规则引擎
        notifications = check_notifications(parsed)
        
        return ParseResponse(
            success=True,
            parsed=parsed,
            missing_fields=missing,
            notifications=notifications
        )
        
    except json.JSONDecodeError as e:
        return ParseResponse(
            success=False,
            error=f"AI 返回的数据格式有误，请重试。技术细节：{str(e)}"
        )
    except Exception as e:
        return ParseResponse(
            success=False,
            error=f"解析失败：{str(e)}"
        )


@app.get("/api/v1/health")
def health_check():
    """健康检查接口，确认各服务连接状态"""
    checks = {
        "api": "ok",
        "deepseek_key": "configured" if os.getenv("DEEPSEEK_API_KEY") else "missing",
        "supabase_url": "configured" if os.getenv("SUPABASE_URL") else "missing",
        "supabase_key": "configured" if os.getenv("SUPABASE_KEY") else "missing",
    }
    return checks