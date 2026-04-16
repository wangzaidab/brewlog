/* eslint-disable */
import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Trash2, Star, AlertCircle } from 'lucide-react';
import { getRecords, deleteRecord } from '../services/api';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('全部');
  const [expandedId, setExpandedId] = useState(null);

  // 场景化快捷筛选项
  const filterTabs = ['全部', '🏆 神仙杯', '🚧 翻车复盘', '浅烘', '中烘', '深烘'];

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try { 
      // 注意：这里的 filter 传给后端后，后端需要识别 "🏆 神仙杯" 
      // 并将其转化为 SQL 查询 (例如 rating >= 8)
      const r = await getRecords(1, 50, search, filter === '全部' ? '' : filter); 
      if (r.success) setRecords(r.records); 
    }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const del = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这条冲煮记录吗？')) return;
    try { await deleteRecord(id); setRecords(records.filter(r => r.id !== id)); } 
    catch { alert('删除失败'); }
  };

  return (
    <div className="px-6 pt-16 pb-32 min-h-screen bg-background">
      <h1 className="font-serif text-3xl font-bold text-foreground mb-8 tracking-wide">冲煮历史</h1>

      {/* 核心搜索栏 (Omni-search) */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          onKeyDown={e => { if(e.key === 'Enter') load(); }}
          placeholder="搜索豆种、产地、品牌或风味..."
          className="w-full pl-12 pr-6 py-4 rounded-[2rem] text-base bg-card text-foreground shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-muted-foreground" 
        />
      </div>

      {/* 场景化快捷筛选 (Smart Quick Filters) */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filterTabs.map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 active:scale-95 ${
              filter === f 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-card text-muted-foreground border border-border hover:bg-muted'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* 列表渲染区 */}
      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <p className="text-sm text-muted-foreground">回溯记忆中...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-24 rounded-[2rem] bg-card border border-border shadow-sm">
          <p className="text-5xl mb-4 opacity-30 grayscale">☕</p>
          <p className="text-base font-medium text-foreground">没有找到相关记录</p>
          <p className="text-sm mt-2 text-muted-foreground">换个关键词，或者去冲一杯新的吧</p>
        </div>
      ) : (
        <div className="space-y-5">
          {records.map(r => (
            <BrewCard key={r.id} record={r} isExpanded={expandedId === r.id}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              onDelete={e => del(r.id, e)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== 单条记录卡片组件 ===== */
function BrewCard({ record, isExpanded, onToggle, onDelete }) {
  const dateStr = record.created_at ? new Date(record.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';
  const tags = Array.isArray(record.flavor_tags) ? record.flavor_tags : [];
  
  // 评分视觉处理：高分用高亮焦糖色，低分（翻车）用暗淡或警示色
  const ratingColor = record.rating >= 8 ? 'text-secondary' : (record.rating < 6 ? 'text-destructive/80' : 'text-foreground');

  return (
    <div className="rounded-[2rem] overflow-hidden bg-card border border-border shadow-sm transition-all duration-300 hover:shadow-md">
      {/* 卡片头部区域 (可点击展开) */}
      <div className="p-6 cursor-pointer" onClick={onToggle}>
        
        {/* 第一排：日期与评分 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase">{dateStr}</span>
          <div className="flex items-center gap-2">
            {record.rating != null && (
              <div className={`flex items-center gap-1 font-serif ${ratingColor}`}>
                <Star size={14} fill="currentColor" strokeWidth={0} />
                <span className="text-lg font-bold">{record.rating}</span>
                <span className="text-xs opacity-50 font-sans">/10</span>
              </div>
            )}
            <div className="p-1 rounded-full bg-muted/50 text-muted-foreground ml-1">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* 核心信息：豆子名称与烘焙商 */}
        <div className="mb-4">
          <h3 className="font-serif text-xl font-bold text-foreground leading-tight">
            {record.bean_name || '未知豆种'}
          </h3>
          {record.brand && <p className="text-sm mt-1 text-muted-foreground">{record.brand}</p>}
        </div>

        {/* 关键参数（一目了然） */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
          {record.roast_level && <ParamBadge value={record.roast_level} />}
          {record.process_method && <ParamBadge value={record.process_method} />}
          {record.water_temp_c && <ParamBadge value={`${record.water_temp_c}°C`} />}
          {record.brew_ratio && <ParamBadge value={record.brew_ratio} />}
        </div>

        {/* 风味标签 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 4).map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" 
                style={{ background: `${getTagColor(t)}1A`, color: getTagColor(t) }}>
                {t}
              </span>
            ))}
            {tags.length > 4 && <span className="px-2 py-1 text-xs text-muted-foreground">+{tags.length - 4}</span>}
          </div>
        )}
      </div>

      {/* 展开的详情面板 */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-border bg-accent/5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mt-6">
            
            {(record.water_brand || record.water_amount_g) && (
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">水与粉</p>
                <div className="space-y-2">
                  {record.water_brand && <DetailRow label="用水" value={record.water_brand} />}
                  {record.dose_g && <DetailRow label="粉重" value={`${record.dose_g}g`} />}
                  {record.water_amount_g && <DetailRow label="注水量" value={`${record.water_amount_g}ml`} />}
                  {record.liquid_out_g && <DetailRow label="出液量" value={`${record.liquid_out_g}g`} />}
                </div>
              </div>
            )}

            {(record.brew_method || record.brew_time) && (
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">手法</p>
                <div className="space-y-2">
                  {record.brew_method && <DetailRow label="器具" value={record.brew_method} />}
                  {record.grind_size && <DetailRow label="研磨" value={record.grind_size} />}
                  {record.brew_time && <DetailRow label="时间" value={record.brew_time} />}
                  {record.rest_days != null && <DetailRow label="养豆" value={`${record.rest_days}天`} />}
                </div>
              </div>
            )}
          </div>

          {record.flavor_note && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">风味描述</p>
              <p className="text-sm leading-relaxed text-foreground">{record.flavor_note}</p>
            </div>
          )}

          {record.notes && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">复盘笔记</p>
              <p className="text-sm leading-relaxed text-foreground italic">{record.notes}</p>
            </div>
          )}

          {/* 操作区 */}
          <div className="flex justify-end mt-6">
            <button onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors">
              <Trash2 size={14} /> 删除记录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 辅助 UI 组件 ===== */

function ParamBadge({ value }) {
  return (
    <span className="text-sm font-medium text-muted-foreground">
      {value}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function getTagColor(tag) {
  const m = [
    [['蓝莓','草莓','柑橘','柠檬','苹果','葡萄','芒果','百香果','水果','果','酸'], 'var(--chart-5)'],
    [['花','茉莉','玫瑰','薰衣','佛手柑'], 'var(--chart-2)'],
    [['坚果','杏仁','榛果','巧克力','可可','苦','木'], 'var(--chart-4)'],
    [['焦糖','蜂蜜','红糖','黑糖','太妃','甜'], 'var(--chart-1)'],
  ];
  for (const [k, c] of m) { if (k.some(x => tag.includes(x))) return c; }
  return 'var(--muted-foreground)';
}