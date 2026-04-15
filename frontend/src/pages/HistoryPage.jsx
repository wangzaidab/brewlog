import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getRecords, deleteRecord } from '../services/api';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try { const r = await getRecords(1,50,search,filter); if(r.success) setRecords(r.records); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const del = async (id,e) => {
    e.stopPropagation();
    if(!confirm('确定删除？')) return;
    try { await deleteRecord(id); setRecords(records.filter(r=>r.id!==id)); } catch { alert('删除失败'); }
  };

  return (
    <div className="px-6 pt-8 pb-24">
      <h1 className="font-serif text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>冲煮历史</h1>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-hint)' }} />
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')load();}}
          placeholder="搜索豆种、产地、品牌..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm"
          style={{ background: 'var(--bg-input)', boxShadow: 'var(--shadow-soft)', border: 'none', color: 'var(--text-primary)' }} />
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {['','浅烘','中烘','中深','深烘'].map(f=>(
          <button key={f||'all'} onClick={()=>setFilter(f)}
            className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200"
            style={{ background: filter===f?'var(--accent)':'var(--bg-input)', color: filter===f?'#fff':'var(--text-secondary)', boxShadow: filter===f?'0 2px 12px rgba(53,92,79,0.15)':'var(--shadow-soft)' }}>
            {f||'全部'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-20 text-sm" style={{ color: 'var(--text-hint)' }}>加载中...</p>
      ) : records.length===0 ? (
        <div className="text-center py-20 rounded-3xl" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-soft)' }}>
          <p className="text-5xl mb-4 opacity-20">☕</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>还没有记录</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-hint)' }}>去「记录」冲一杯吧</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(r=>(
            <BrewCard key={r.id} record={r} isExpanded={expandedId===r.id}
              onToggle={()=>setExpandedId(expandedId===r.id?null:r.id)}
              onDelete={e=>del(r.id,e)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BrewCard({ record, isExpanded, onToggle, onDelete }) {
  const date = record.created_at ? new Date(record.created_at).toLocaleDateString('zh-CN',{month:'short',day:'numeric',weekday:'short'}) : '';
  const tags = Array.isArray(record.flavor_tags) ? record.flavor_tags : [];

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        {/* 日期 + 评分 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{date}</span>
          <div className="flex items-center gap-1.5">
            {record.rating!=null && <span className="text-lg font-semibold" style={{ color: 'var(--caramel)' }}>{record.rating}<span className="text-[10px] font-normal" style={{ color: 'var(--text-hint)' }}>/10</span></span>}
            {isExpanded?<ChevronUp size={14} style={{ color: 'var(--text-hint)' }} />:<ChevronDown size={14} style={{ color: 'var(--text-hint)' }} />}
          </div>
        </div>

        {/* 豆名 */}
        <div className="mb-2">
          <span className="font-serif text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{record.bean_name||'未知豆种'}</span>
          {record.brand && <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{record.brand}</span>}
        </div>

        {/* 参数摘要 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {record.roast_level && <span>{record.roast_level}</span>}
          {record.process_method && <span>{record.process_method}</span>}
          {record.water_temp_c && <span>{record.water_temp_c}°C</span>}
          {record.brew_ratio && <span>{record.brew_ratio}</span>}
          {record.rest_days!=null && <span>养{record.rest_days}天</span>}
        </div>

        {/* 风味标签 */}
        {tags.length>0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0,5).map((t,i)=>(
              <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: fc(t)+'12', color: fc(t) }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="anim-fade-up" style={{ borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          {(record.water_brand||record.water_amount_g) && (
            <Section title="水的信息">
              {record.water_brand && <Info label="用水" value={record.water_brand} />}
              {record.water_category && <Info label="分类" value={record.water_category} />}
              {record.water_amount_g && <Info label="注水量" value={`${record.water_amount_g}ml`} />}
              {record.dose_g && <Info label="粉重" value={`${record.dose_g}g`} />}
              {record.liquid_out_g && <Info label="出液量" value={`${record.liquid_out_g}g`} />}
            </Section>
          )}
          {(record.brew_method||record.grind_size) && (
            <Section title="冲煮方案">
              {record.brew_method && <Info label="方式" value={record.brew_method} />}
              {record.grind_size && <Info label="研磨度" value={record.grind_size} />}
              {record.brew_time && <Info label="时间" value={record.brew_time} />}
            </Section>
          )}
          {record.flavor_note && (
            <Section title="风味分析">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{record.flavor_note}</p>
            </Section>
          )}
          {record.notes && (
            <Section title="备注">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{record.notes}</p>
            </Section>
          )}
          <div className="px-5 py-4 flex justify-end">
            <button onClick={onDelete} className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--error)', opacity: 0.4 }}>
              <Trash2 size={12} /> 删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
      <p className="text-[11px] font-medium mb-3" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{title}</p>
      {children}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs" style={{ color: 'var(--text-hint)' }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function fc(tag) {
  const m=[
    [['蓝莓','覆盆子','草莓','柑橘','橙','柠檬','苹果','葡萄','樱桃','芒果','百香果','黑醋栗','水果','莓','果'],'#E17055'],
    [['花','茉莉','玫瑰','薰衣','佛手柑'],'#E84393'],
    [['坚果','杏仁','榛果','巧克力','可可'],'#81614B'],
    [['焦糖','蜂蜜','红糖','黑糖','太妃'],'#E08A4A'],
    [['酸','明亮','果酸','上扬'],'#00B894'],
    [['苦','涩','烟','木'],'#6D5B4B'],
    [['甜','蜂蜜','糖','甘'],'#FDCB6E'],
  ];
  for(const[k,c]of m){if(k.some(x=>tag.includes(x)))return c;}
  return'#95A5A6';
}
