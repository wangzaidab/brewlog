"""
BrewLog 后端 - 完整修复版 (v1.0)
功能：AI 解析、记录保存、场景化历史查询、智能建议
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

# ============================================
# 初始化配置
# ============================================

# 读取 .env 环境变量
load_dotenv(dotenv_path="../.env")

app = FastAPI(
    title="BrewLog API",
    description="说一句话，记一杯咖啡",
    version="1.0.0"
)

# CORS 配置：允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化客户端
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# ============================================
# 数据模型 (Pydantic Models)
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

class SaveBrewRequest(ParsedBrew):
    # 继承 ParsedBrew 所有字段，额外增加原始输入
    raw_input: str
    input_type: str = "text"
    grinder_model: str | None = None
    grinder_burr: str | None = None
    dripper_model: str | None = None

# ============================================
# AI 解析 Prompt
# ============================================

PARSE_SYSTEM_PROMPT = """你是 BrewLog 的智能解析引擎。用户会用自然语言描述一次咖啡冲煮体验，你需要从中提取结构化数据并给出风味解读。

## 需要提取的字段

### 基础信息
- brand: 品牌/烘焙商（如"colinplus"、"Fisher"）
- bean_name: 豆种（如"肯尼亚 AA"）
- origin: 产地
- process_method: 处理法
- roast_level: 烘焙度（浅烘/中烘/中深/深烘）
- roast_date: 烘焙日期 (YYYY-MM-DD)
- brew_method: 方式（如"V60"、"摩卡壶"）
- dose_g: 粉重(g)
- water_amount_g: 水量(g)
- water_temp_c: 水温(℃)
- rating: 评分 (1-10)

### 风味相关字段（三个字段必须都填）
- flavor_raw: 用户原话中描述风味/口感的片段，数组形式保留原话。
  示例：用户说"喝起来有点像蓝莓，还有淡淡花香"，则 flavor_raw = ["有点像蓝莓", "淡淡花香"]
  
- flavor_tags: 映射到 SCA 风味轮的标准词，数组形式。
  示例：flavor_tags = ["蓝莓", "花香", "明亮果酸"]
  
- flavor_note: 风味小记。一段 30-60 字的自然语言点评，像一个懂咖啡的朋友在旁边聊天的语气。
  要求：翻译用户的描述到咖啡行业术语，给出简短评价，不说教。
  示例："你说的蓝莓感属于明亮果酸类，这是浅烘水洗肯尼亚的招牌风味，说明萃取到位了。"
  如果用户没描述风味，flavor_note 返回 null。

### 其他字段
- notes: 用户文字中与冲煮无关的个人感受、场景描述（如"今天心情不错"、"下雨天适合喝咖啡"），保留用户原话。

## 规则

1. 用户未提及的字段设为 null，不要猜测具体数值
2. 今天的日期是 {today}
3. 所有风味相关描述必须同时填入 flavor_raw 和 flavor_tags，并生成 flavor_note
4. flavor_note 的语气要自然、温和，像朋友聊天，不要使用"你应该"、"建议你"等说教语气
5. 严格返回合法的 JSON，不要有任何解释文字"""

# ============================================
# 逻辑引擎 (Notifications)
# ============================================

def check_notifications(parsed: ParsedBrew) -> list[dict]:
    """单次冲煮建议"""
    n = []
    if parsed.rest_days is not None:
        if parsed.rest_days < 7: n.append({"type": "warning", "message": f"才养了{parsed.rest_days}天，风味可能没全开。"})
    if parsed.water_temp_c and parsed.roast_level:
        if "浅" in parsed.roast_level and parsed.water_temp_c < 88:
            n.append({"type": "tip", "message": "浅烘豆建议水温高一点（90℃+）以充分萃取。"})
    if parsed.rating and parsed.rating <= 5:
        n.append({"type": "cheer", "message": "没关系，失败的记录也是通往好咖啡的必经之路。"})
    return n

def check_history_notifications(records: list) -> list[dict]:
    """历史里程碑建议"""
    n = []
    total = len(records)
    milestones = {1: "首杯记录！好的开始。", 10: "第10杯！你开始建立自己的风味库了。", 50: "50杯达成！你已经是资深玩家了。"}
    if total in milestones: n.append({"type": "milestone", "message": milestones[total]})
    return n

# ============================================
# API 路由 (Endpoints)
# ============================================

@app.get("/")
def root():
    return {"status": "ok", "app": "BrewLog API"}

@app.post("/api/v1/brew/parse", response_model=ParseResponse)
async def parse_brew(request: ParseRequest):
    """接口 1: 调用 AI 解析文字描述"""
    if not request.raw_input.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")
    try:
        today = date.today().isoformat()
        prompt = PARSE_SYSTEM_PROMPT.format(today=today)
        
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": request.raw_input}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(response.choices[0].message.content)
        parsed = ParsedBrew(**data)
        
        # 计算辅助字段
        if parsed.dose_g and parsed.water_amount_g and parsed.dose_g > 0:
            parsed.brew_ratio = f"1:{round(parsed.water_amount_g / parsed.dose_g, 1)}"
        if parsed.roast_date:
            try: parsed.rest_days = (date.today() - date.fromisoformat(parsed.roast_date)).days
            except: pass
            
        # 检查缺失
        missing = [v for k, v in {"bean_name":"豆名","dose_g":"粉重","water_temp_c":"水温","rating":"评分"}.items() if getattr(parsed, k) is None]
        
        return ParseResponse(success=True, parsed=parsed, missing_fields=missing, notifications=check_notifications(parsed))
    except Exception as e:
        print(f"❌ AI解析报错: {str(e)}")
        return ParseResponse(success=False, error=str(e))

@app.post("/api/v1/brew/records")
async def save_record(request: SaveBrewRequest):
    """接口 2: 保存记录到数据库"""
    demo_user_id = "00000000-0000-0000-0000-000000000001"
    try:
        # 将数组转换为 Supabase 支持的格式（JSON 字符串）
        data = request.dict()
        data["user_id"] = demo_user_id
        data["flavor_raw"] = json.dumps(data.get("flavor_raw", []), ensure_ascii=False)
        data["flavor_tags"] = json.dumps(data.get("flavor_tags", []), ensure_ascii=False)
        
        result = supabase.table("brew_records").insert(data).execute()
        
        # 触发历史通知
        all_res = supabase.table("brew_records").select("id").eq("user_id", demo_user_id).execute()
        return {"success": True, "record": result.data[0] if result.data else None, "notifications": check_history_notifications(all_res.data)}
    except Exception as e:
        print(f"❌ 保存报错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/brew/records")
async def get_records(page: int = 1, limit: int = 50, search: str | None = None, roast_level: str | None = None):
    """接口 3: 获取并筛选历史记录"""
    demo_user_id = "00000000-0000-0000-0000-000000000001"
    try:
        query = supabase.table("brew_records").select("*").eq("user_id", demo_user_id)
        
        # 搜索逻辑：豆名 OR 产地 OR 品牌
        if search:
            query = query.or_(f"bean_name.ilike.%{search}%,origin.ilike.%{search}%,brand.ilike.%{search}%")
        
        # 场景化筛选逻辑
        if roast_level and roast_level != "全部":
            if roast_level == "🏆 神仙杯":
                query = query.gte("rating", 8)
            elif roast_level == "🚧 翻车复盘":
                query = query.lte("rating", 5)
            else:
                query = query.eq("roast_level", roast_level)
        
        # 分页与排序
        offset = (page - 1) * limit
        result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        # 格式化 JSON 字段
        records = []
        for r in result.data:
            for f in ['flavor_raw', 'flavor_tags']:
                if r.get(f) and isinstance(r[f], str):
                    try: r[f] = json.loads(r[f])
                    except: r[f] = []
            records.append(r)
            
        return {"success": True, "records": records, "total": len(records)}
    except Exception as e:
        print(f"\n🚨 后端查询逻辑报错: {str(e)}\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/brew/records/{record_id}")
async def delete_record(record_id: str):
    """接口 4: 删除记录"""
    try:
        supabase.table("brew_records").delete().eq("id", record_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/health")
def health():
    return {"api": "ok", "time": datetime.now().isoformat()}