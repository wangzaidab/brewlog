"""
BrewLog 后端 - 主文件
用 FastAPI 构建 API，调用 DeepSeek 做自然语言解析
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, date
import os
import json
import random
import uuid

# 读取 .env 文件中的环境变量
load_dotenv(dotenv_path="../.env")

# 初始化 FastAPI 应用
app = FastAPI(
    title="BrewLog API",
    description="说一句话，记一杯咖啡",
    version="0.1.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 DeepSeek 客户端
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# 初始化 Supabase 客户端
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)


# ============================================
# 数据模型
# ============================================

class ParseRequest(BaseModel):
    raw_input: str
    input_type: str = "text"

class ParsedBrew(BaseModel):
    bean_name: str | None = None
    brand: str | None = None
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
    success: bool
    parsed: ParsedBrew | None = None
    missing_fields: list[str] = []
    notifications: list[dict] = []
    error: str | None = None

class SaveBrewRequest(BaseModel):
    bean_name: str | None = None
    brand: str | None = None
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
    grinder_model: str | None = None
    grinder_burr: str | None = None
    dripper_model: str | None = None
    flavor_raw: list[str] | None = None
    flavor_tags: list[str] | None = None
    flavor_note: str | None = None
    rating: float | None = None
    notes: str | None = None
    raw_input: str
    input_type: str = "text"


# ============================================
# DeepSeek 解析 Prompt
# ============================================

PARSE_SYSTEM_PROMPT = """你是 BrewLog 的智能解析引擎。用户会用自然语言描述一次咖啡冲煮体验，你需要从中提取结构化数据。

## 你需要提取的字段
0. brand:咖啡豆品牌/烘焙商名称（如"colinplus"、"Fisher"、"杉下咖啡"）。用户可能用简称如"colin家的"，你需要提取出品牌关键词。如果用户没提到品牌则为null。brand和bean_name要分开：brand是"谁卖的/谁烘的"，bean_name是"什么豆子"。
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
| 农夫山泉 | 农夫山泉 | 天然矿泉水 | 中等 |
| 怡宝 | 怡宝 | 纯净水 | 极低(~0) |
| 怡宝+Aquacode 或类似调配 | 怡宝+Aquacode调配 | 定制矿物质水 | 定制 |
| 百岁山 | 百岁山 | 天然矿泉水 | 较高 |
| 屈臣氏蒸馏水 | 屈臣氏 | 蒸馏水 | 极低(~0) |
| 自来水/过滤水 | 自来水(过滤) | 过滤水 | 未知 |
| 其他品牌 | 保留用户表述 | 瓶装水 | 未知 |

## 风味翻译规则

将用户的口语化风味描述映射到 SCA 咖啡风味轮的标准分类：
- 大分类：花香、水果、酸质、甜感、坚果/可可、焦糖化、香料、谷物、烘烤、其他
- 用户说"像蓝莓"→ flavor_tags 里写"蓝莓"，属于"水果"大类
- 用户说"烤地瓜味"→ flavor_tags 里写"焦糖化/烤红薯"，属于"焦糖化"大类

风味翻译说明（flavor_note）的语气要求：
- 不纠正用户，而是"翻译+共情"
- 当用户描述精准时给予肯定

## 重要规则

1. 用户没有提及的字段，设为 null，不要猜测
2. 今天的日期是 {today}，用于推算相对日期
3. flavor_raw 保留用户的原始表达，flavor_tags 映射到标准风味词
4. 始终返回合法的 JSON，不要有多余的解释文字

## 输出格式

请严格返回以下 JSON 格式，不要包含任何其他文字：

{{
    "brand": "...",
    "bean_name": "...", "origin": "...", "process_method": "...",
    "roast_level": "...", "roast_date": "YYYY-MM-DD 或 null",
    "rest_days": null, "brew_method": "...",
    "dose_g": null, "water_amount_g": null, "liquid_out_g": null,
    "brew_ratio": null, "water_temp_c": null, "grind_size": "...",
    "brew_time": "...", "water_brand": "...", "water_category": "...",
    "water_tds": "...",
    "flavor_raw": [], "flavor_tags": [], "flavor_note": "...",
    "rating": null, "notes": "..."
}}"""


# ============================================
# 智能提示规则引擎
# ============================================

def check_notifications(parsed: ParsedBrew) -> list[dict]:
    notifications = []
    
    if parsed.rest_days is not None:
        if parsed.rest_days < 7:
            notifications.append({"type": "rest_days_short", "message": f"这批豆子才养了{parsed.rest_days}天，风味可能还没完全打开，过几天再冲一杯对比看看？"})
        elif parsed.rest_days > 60:
            notifications.append({"type": "rest_days_long", "message": f"这批豆子烘焙已经{parsed.rest_days}天了，风味可能有所衰减，如果觉得味道变平了这可能是原因。"})
    
    if parsed.water_temp_c is not None and parsed.roast_level is not None:
        roast, temp = parsed.roast_level, parsed.water_temp_c
        if "浅" in roast and temp < 88:
            notifications.append({"type": "temp_low_for_light", "message": f"浅烘豆配{temp}℃可能会萃取不足，容易出现尖酸感。试试提高到90-93℃？"})
        elif "深" in roast and temp > 93:
            notifications.append({"type": "temp_high_for_dark", "message": f"深烘豆配{temp}℃可能会过萃，容易出苦涩。试试降到88-90℃？"})
        elif temp < 85 or temp > 96:
            notifications.append({"type": "temp_unusual", "message": f"水温{temp}℃偏离常规范围，确认一下是否记录正确？"})
    
    if parsed.brew_ratio is not None:
        try:
            ratio_value = float(parsed.brew_ratio.replace("1:", ""))
            if ratio_value < 12:
                notifications.append({"type": "ratio_too_strong", "message": f"粉水比{parsed.brew_ratio}偏浓，确认一下注水量是否正确？"})
            elif ratio_value > 18:
                notifications.append({"type": "ratio_too_weak", "message": f"粉水比{parsed.brew_ratio}偏稀，确认一下粉重是否正确？"})
        except (ValueError, AttributeError):
            pass
    
    if parsed.grind_size is not None and parsed.brew_method is not None:
        grind, method = parsed.grind_size.lower(), parsed.brew_method.lower()
        if any(m in method for m in ["摩卡", "意式"]) and any(g in grind for g in ["粗", "中粗"]):
            notifications.append({"type": "grind_mismatch", "message": "摩卡壶/意式通常用较细的研磨度，确认一下研磨设置？"})
        elif any(m in method for m in ["法压"]) and any(g in grind for g in ["细", "极细"]):
            notifications.append({"type": "grind_mismatch", "message": "法压壶通常用较粗的研磨度，太细可能会过萃且不好压。"})
    
    if parsed.rating is not None and parsed.rating <= 5:
        msgs = ["冲煮实验本来就是试错的过程，记录下来就是进步。", "每一杯'不太好'的记录，都在帮你更接近完美的那一杯。", "就算是世界冠军也有翻车的时候，别太在意。", "数据记下来了，下一杯调整就有方向了。", "不好喝也是有价值的数据——至少你知道这组参数不太行了。"]
        notifications.append({"type": "low_score_encouragement", "message": random.choice(msgs)})
    
    return notifications


def check_history_notifications(records: list) -> list[dict]:
    notifications = []
    if not records:
        return notifications
    
    total = len(records)
    milestones = {1: "第一杯记录完成！好的开始。", 10: "第10杯！你已经开始建立自己的冲煮数据库了。", 30: "30杯！你的口味画像已经很清晰了，去数据页看看？", 50: "50杯！你比大多数手冲玩家都更了解自己的口味了。", 100: "100杯！你是认真的。"}
    if total in milestones:
        notifications.append({"type": "milestone", "message": milestones[total]})
    
    sorted_records = sorted(records, key=lambda r: r.get('created_at', ''), reverse=True)
    recent = sorted_records[:3]
    if len(recent) >= 3:
        ratings = [r.get('rating') for r in recent if r.get('rating') is not None]
        if len(ratings) >= 3 and all(r >= 8 for r in ratings):
            notifications.append({"type": "high_score_streak", "message": f"最近状态不错！连续{len(ratings)}杯高分 🔥"})
    
    bean_groups = {}
    for r in records:
        name = r.get('bean_name')
        if name:
            bean_groups.setdefault(name, []).append(r)
    
    for bean_name, bean_records in bean_groups.items():
        if len(bean_records) >= 3:
            ratings = [r.get('rating') for r in bean_records if r.get('rating') is not None]
            if ratings and sum(ratings) / len(ratings) < 6:
                temps = [r.get('water_temp_c') for r in bean_records if r.get('water_temp_c') is not None]
                if temps and (max(temps) - min(temps)) > 3:
                    notifications.append({"type": "bean_quality_warning", "bean_name": bean_name, "message": f"「{bean_name}」你用不同参数冲了{len(bean_records)}次，评分都不太高。也许不是你的问题——有些豆子品质确实一般。试试换一包？"})
    
    return notifications


# ============================================
# API 接口
# ============================================

@app.get("/")
def root():
    return {"message": "BrewLog API is running", "version": "0.1.0"}

@app.post("/api/v1/brew/parse", response_model=ParseResponse)
async def parse_brew(request: ParseRequest):
    if not request.raw_input.strip():
        raise HTTPException(status_code=400, detail="输入不能为空")
    try:
        today = date.today().isoformat()
        system_prompt = PARSE_SYSTEM_PROMPT.replace("{today}", today)
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": request.raw_input}],
            temperature=0.1, max_tokens=2000, response_format={"type": "json_object"}
        )
        result_text = response.choices[0].message.content
        parsed_data = json.loads(result_text)
        parsed = ParsedBrew(**parsed_data)
        
        if parsed.dose_g and parsed.water_amount_g and parsed.dose_g > 0:
            parsed.brew_ratio = f"1:{round(parsed.water_amount_g / parsed.dose_g, 1)}"
        if parsed.roast_date:
            try:
                parsed.rest_days = (date.today() - date.fromisoformat(parsed.roast_date)).days
            except ValueError:
                pass
        
        missing = []
        for field, label in {"bean_name": "豆种", "roast_level": "烘焙度", "brew_method": "冲煮方式", "dose_g": "粉重", "water_amount_g": "注水量", "water_temp_c": "水温", "grind_size": "研磨度", "rating": "评分"}.items():
            if getattr(parsed, field) is None:
                missing.append(label)
        
        return ParseResponse(success=True, parsed=parsed, missing_fields=missing, notifications=check_notifications(parsed))
    except json.JSONDecodeError as e:
        return ParseResponse(success=False, error=f"AI 返回的数据格式有误，请重试。")
    except Exception as e:
        return ParseResponse(success=False, error=f"解析失败：{str(e)}")

@app.post("/api/v1/brew/records")
async def save_record(request: SaveBrewRequest):
    """保存冲煮记录到 Supabase"""
    demo_user_id = "00000000-0000-0000-0000-000000000001"
    record = {
        "id": str(uuid.uuid4()),
        "user_id": demo_user_id,
        "brand": request.brand,
        "bean_name": request.bean_name, "origin": request.origin,
        "process_method": request.process_method, "roast_level": request.roast_level,
        "roast_date": request.roast_date, "rest_days": request.rest_days,
        "brew_method": request.brew_method, "dose_g": request.dose_g,
        "water_amount_g": request.water_amount_g, "liquid_out_g": request.liquid_out_g,
        "brew_ratio": request.brew_ratio, "water_temp_c": request.water_temp_c,
        "grind_size": request.grind_size, "brew_time": request.brew_time,
        "water_brand": request.water_brand, "water_category": request.water_category,
        "water_tds": request.water_tds, "grinder_model": request.grinder_model,
        "grinder_burr": request.grinder_burr, "dripper_model": request.dripper_model,
        "flavor_raw": json.dumps(request.flavor_raw, ensure_ascii=False) if request.flavor_raw else None,
        "flavor_tags": json.dumps(request.flavor_tags, ensure_ascii=False) if request.flavor_tags else None,
        "flavor_note": request.flavor_note, "rating": request.rating,
        "notes": request.notes, "raw_input": request.raw_input,
        "input_type": request.input_type,
    }
    try:
        result = supabase.table("brew_records").insert(record).execute()
        all_records = supabase.table("brew_records").select("*").eq("user_id", demo_user_id).order("created_at", desc=True).execute()
        return {"success": True, "record": result.data[0] if result.data else None, "notifications": check_history_notifications(all_records.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败：{str(e)}")

@app.get("/api/v1/brew/records")
async def get_records(page: int = 1, limit: int = 20, search: str | None = None, roast_level: str | None = None):
    """获取冲煮记录列表"""
    demo_user_id = "00000000-0000-0000-0000-000000000001"
    try:
        query = supabase.table("brew_records").select("*").eq("user_id", demo_user_id).order("created_at", desc=True)
        if search:
            query = query.or_(f"bean_name.ilike.%{search}%,origin.ilike.%{search}%")
        if roast_level:
            query = query.eq("roast_level", roast_level)
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        result = query.execute()
        
        records = []
        for r in result.data:
            for field in ['flavor_raw', 'flavor_tags']:
                if r.get(field) and isinstance(r[field], str):
                    try: r[field] = json.loads(r[field])
                    except: pass
            records.append(r)
        return {"success": True, "records": records, "page": page, "total": len(records)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败：{str(e)}")

@app.delete("/api/v1/brew/records/{record_id}")
async def delete_record(record_id: str):
    try:
        supabase.table("brew_records").delete().eq("id", record_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败：{str(e)}")

@app.get("/api/v1/health")
def health_check():
    return {"api": "ok", "deepseek_key": "configured" if os.getenv("DEEPSEEK_API_KEY") else "missing", "supabase_url": "configured" if os.getenv("SUPABASE_URL") else "missing", "supabase_key": "configured" if os.getenv("SUPABASE_KEY") else "missing"}
