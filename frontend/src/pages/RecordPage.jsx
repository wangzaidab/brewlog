import { useState } from 'react';
import { Mic, Camera, Loader2, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { parseBrew, saveRecord } from '../services/api';
import FlavorWheel from '../components/FlavorWheel';

export default function RecordPage() {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveNotifications, setSaveNotifications] = useState([]);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true); setError(null); setParseResult(null); setEditedData(null); setSaveSuccess(false);
    try {
      const r = await parseBrew(inputText);
      if (r.success) { setParseResult(r); setEditedData({ ...r.parsed }); }
      else setError(r.error || '记录失败，请重试');
    } catch { setError('无法连接服务器'); }
    finally { setIsParsing(false); }
  };

  const handleSave = async () => {
    if (!editedData) return;
    setIsSaving(true); setError(null);
    try {
      const r = await saveRecord({ ...editedData, raw_input: inputText, input_type: 'text' });
      if (r.success) { setSaveSuccess(true); setSaveNotifications(r.notifications || []); }
      else setError('保存失败');
    } catch (e) { setError(`保存失败：${e.message}`); }
    finally { setIsSaving(false); }
  };

  const upd = (f, v) => setEditedData(p => ({ ...p, [f]: v }));

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('请使用 Chrome 浏览器'); return; }
    const r = new SR(); r.lang='zh-CN'; r.interimResults=false; r.continuous=false;
    r.onstart=()=>setIsListening(true);
    r.onresult=(e)=>setInputText(p=>p+e.results[0][0].transcript);
    r.onerror=(e)=>{setError('语音出错: '+e.error);setIsListening(false);};
    r.onend=()=>setIsListening(false);
    r.start();
  };

  const reset = () => { setInputText('');setParseResult(null);setEditedData(null);setError(null);setSaveSuccess(false);setSaveNotifications([]); };

  /* ===== 保存成功 ===== */
  if (saveSuccess) return (
    <div className="px-6 pt-14 anim-fade-up">
      <div className="text-center py-16 rounded-3xl" style={{ background: 'var(--accent-bg)' }}>
        <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'var(--accent)', color: '#fff' }}><Check size={24} /></div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>记录已保存</p>
        <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>去「历史」查看</p>
      </div>
      {saveNotifications.map((n,i)=>(
        <div key={i} className="mt-4 py-4 px-5 rounded-2xl text-sm" style={{ background: 'var(--caramel-bg)', color: 'var(--caramel)' }}>🎉 {n.message}</div>
      ))}
      <button onClick={reset} className="w-full mt-8 py-4 rounded-2xl text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>再记一杯</button>
    </div>
  );

  /* ===== 解析结果 ===== */
  if (parseResult && editedData) return (
    <div className="px-6 pt-8 pb-32">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>记录详情</h1>
        <button onClick={reset} className="text-xs px-4 py-1.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>重新输入</button>
      </div>
      <p className="text-[11px] mb-8" style={{ color: 'var(--text-hint)' }}>点击字段可修改</p>

      {error && <div className="mb-6 p-4 rounded-2xl flex items-start gap-3 text-xs" style={{ background: 'rgba(168,84,84,0.05)', color: 'var(--error)' }}><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}</div>}

      <Card title="咖啡豆信息" i={0}>
        <Row label="品牌" value={editedData.brand} onChange={v=>upd('brand',v)} />
        <Row label="名称" value={editedData.bean_name} onChange={v=>upd('bean_name',v)} />
        <Row label="烘焙度" value={editedData.roast_level} onChange={v=>upd('roast_level',v)} />
        <Row label="产地" value={editedData.origin} onChange={v=>upd('origin',v)} />
        <Row label="处理法" value={editedData.process_method} onChange={v=>upd('process_method',v)} />
        <Row label="烘焙日期" value={editedData.roast_date} onChange={v=>upd('roast_date',v)} badge={editedData.rest_days!=null?`养${editedData.rest_days}天`:null} last />
      </Card>

      <Card title="水的信息" i={1}>
        <Row label="水温" value={editedData.water_temp_c!=null?`${editedData.water_temp_c}°C`:null} onChange={v=>upd('water_temp_c',v?parseFloat(v.replace('°C','')):null)} />
        <Row label="粉水比" value={editedData.brew_ratio} onChange={v=>upd('brew_ratio',v)} />
        <Row label="注水量" value={editedData.water_amount_g!=null?`${editedData.water_amount_g}ml`:null} onChange={v=>upd('water_amount_g',v?parseFloat(v.replace(/[a-z]/gi,'')):null)} />
        <Row label="粉重" value={editedData.dose_g!=null?`${editedData.dose_g}g`:null} onChange={v=>upd('dose_g',v?parseFloat(v.replace('g','')):null)} />
        <Row label="出液量" value={editedData.liquid_out_g!=null?`${editedData.liquid_out_g}g`:null} onChange={v=>upd('liquid_out_g',v?parseFloat(v.replace('g','')):null)} />
        <Row label="用水" value={editedData.water_brand} onChange={v=>upd('water_brand',v)} />
        <Row label="水质" value={editedData.water_category} onChange={v=>upd('water_category',v)} last />
      </Card>

      <Card title="冲煮方案" i={2}>
        <Row label="方式" value={editedData.brew_method} onChange={v=>upd('brew_method',v)} />
        <Row label="研磨度" value={editedData.grind_size} onChange={v=>upd('grind_size',v)} />
        <Row label="时间" value={editedData.brew_time} onChange={v=>upd('brew_time',v)} last />
      </Card>

      <Card title="风味描述" i={3}>
        <FlavorWheel tags={editedData.flavor_tags} />
        {editedData.flavor_raw?.length > 0 && (
          <div className="mt-6 space-y-1.5">
            <p className="text-[10px] mb-1" style={{ color: 'var(--text-hint)' }}>你的描述</p>
            {editedData.flavor_raw.map((r,i)=><p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>"{r}"</p>)}
          </div>
        )}
        {editedData.flavor_tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {editedData.flavor_tags.map((t,i)=>(
              <span key={i} className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: fc(t)+'14', color: fc(t) }}>{t}</span>
            ))}
          </div>
        )}
        {editedData.flavor_note && (
          <div className="mt-5 p-4 rounded-2xl text-xs leading-relaxed" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            💬 {editedData.flavor_note}
          </div>
        )}
      </Card>

      <Card title="评分" i={4}>
        <Stars value={editedData.rating} onChange={v=>upd('rating',v)} />
      </Card>

      {editedData.notes && <Card title="备注" i={5}><p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{editedData.notes}</p></Card>}

      {parseResult.missing_fields?.length > 0 && (
        <div className="py-5 px-5 rounded-2xl mb-5" style={{ background: 'rgba(107,141,168,0.04)' }}>
          <p className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>以下信息你没提到，要补充吗？</p>
          <div className="flex flex-wrap gap-2">{parseResult.missing_fields.map((f,i)=>(
            <span key={i} className="px-3 py-1 rounded-full text-[11px]" style={{ border: '1px dashed var(--text-hint)', color: 'var(--text-tertiary)' }}>{f}</span>
          ))}</div>
        </div>
      )}

      {parseResult.notifications?.length > 0 && (
        <div className="space-y-3 mb-5">{parseResult.notifications.map((n,i)=>(
          <div key={i} className="p-4 rounded-2xl text-xs leading-relaxed" style={{ background: n.type.includes('encouragement')?'rgba(90,138,94,0.05)':'rgba(184,146,62,0.05)', color: n.type.includes('encouragement')?'var(--success)':'var(--warning)' }}>💡 {n.message}</div>
        ))}</div>
      )}

      <div className="fixed bottom-16 left-0 right-0 px-6 py-4 safe-bottom" style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-primary)' }}>
        <div className="flex gap-4">
          <button onClick={reset} className="flex-1 py-3.5 rounded-2xl text-sm font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-soft)' }}>取消</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-3.5 rounded-2xl text-sm font-medium" style={{ background: 'var(--accent)', color: '#fff', opacity: isSaving?0.6:1, boxShadow: '0 4px 16px rgba(53,92,79,0.2)' }}>
            {isSaving?'保存中...':'确认记录'}
          </button>
        </div>
      </div>
    </div>
  );

  /* ===== 录入首页 ===== */
  return (
    <div className="px-6 pt-14">
      <div className="text-center mb-14">
        <h1 className="font-serif text-4xl font-semibold" style={{ color: 'var(--accent)', letterSpacing: '-0.5px' }}>BrewLog</h1>
        <p className="text-sm mt-2 font-light tracking-widest" style={{ color: 'var(--caramel)' }}>一句话记好咖啡</p>
      </div>

      <textarea value={inputText} onChange={e=>setInputText(e.target.value)} disabled={isParsing}
        placeholder="记录你的咖啡体验..."
        className="w-full rounded-2xl p-5 text-sm leading-relaxed resize-none mb-6"
        style={{ background: 'var(--bg-input)', boxShadow: 'var(--shadow-soft)', border: 'none', color: 'var(--text-primary)', minHeight: '130px' }}
        rows={5} />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={handleVoice} disabled={isParsing}
          className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl transition-all duration-300 active:scale-[0.97]"
          style={{ background: isListening?'rgba(168,84,84,0.05)':'var(--bg-input)', boxShadow: 'var(--shadow-soft)' }}>
          <Mic size={28} style={{ color: isListening?'var(--error)':'var(--accent)' }} className={isListening?'anim-pulse':''} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isListening?'正在听...':'语音输入'}</span>
        </button>
        <button disabled={isParsing} onClick={()=>setError('照片识别即将上线')}
          className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl transition-all duration-300 active:scale-[0.97]"
          style={{ background: 'var(--bg-input)', boxShadow: 'var(--shadow-soft)' }}>
          <Camera size={28} style={{ color: 'var(--accent)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>添加照片</span>
        </button>
      </div>

      <button onClick={handleParse} disabled={!inputText.trim()||isParsing}
        className="w-full py-4 rounded-2xl text-base font-medium transition-all duration-300 active:scale-[0.98]"
        style={{ background: inputText.trim()&&!isParsing?'var(--accent)':'var(--bg-hover)', color: inputText.trim()&&!isParsing?'#fff':'var(--text-hint)', boxShadow: inputText.trim()&&!isParsing?'0 4px 20px rgba(53,92,79,0.2)':'none' }}>
        {isParsing?<span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" />正在记录...</span>:'开始记录'}
      </button>

      {error && <div className="mt-6 p-4 rounded-2xl flex items-start gap-3 text-xs anim-fade-up" style={{ background: 'rgba(168,84,84,0.04)', color: 'var(--error)' }}><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}</div>}
      {isParsing && <p className="mt-8 text-center text-sm anim-pulse" style={{ color: 'var(--caramel)' }}>AI 正在品味你的描述...</p>}
    </div>
  );
}

/* ===== 子组件 ===== */

function Card({ title, children, i=0 }) {
  return (
    <div className="rounded-2xl py-6 px-5 mb-5 anim-fade-up" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', animationDelay: `${i*0.06}s`, opacity: 0 }}>
      <h3 className="font-serif text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, onChange, badge, last=false }) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState('');
  const startEdit = () => { setTmp(value??''); setEditing(true); };
  const ok = () => { onChange(tmp||null); setEditing(false); };
  const no = () => setEditing(false);

  if (editing) return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: last?'none':'1px solid rgba(0,0,0,0.03)' }}>
      <span className="text-sm w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <input type="text" value={tmp} onChange={e=>setTmp(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')ok();if(e.key==='Escape')no();}}
          autoFocus className="text-sm text-right bg-transparent flex-1 max-w-[180px]"
          style={{ color: 'var(--text-primary)', outline: 'none', borderBottom: '1.5px solid var(--accent)' }} />
        <button onClick={ok} className="p-0.5"><Check size={14} color="var(--success)" /></button>
        <button onClick={no} className="p-0.5"><X size={14} color="var(--error)" /></button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-between py-4 cursor-pointer group" style={{ borderBottom: last?'none':'1px solid rgba(0,0,0,0.03)' }} onClick={startEdit}>
      <span className="text-sm w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: value?'var(--text-primary)':'var(--text-hint)', fontWeight: value?500:300, fontStyle: value?'normal':'italic' }}>
          {value||'点击填写'}
        </span>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--caramel-bg)', color: 'var(--caramel)' }}>{badge}</span>}
        <Pencil size={10} className="opacity-0 group-hover:opacity-20 transition-opacity" />
      </div>
    </div>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {[1,2,3,4,5].map(s=>(
        <button key={s} onClick={()=>onChange(s*2)} className="transition-transform active:scale-125">
          <span className="text-3xl" style={{ color: value&&value/2>=s?'#FDCB6E':'var(--bg-hover)' }}>★</span>
        </button>
      ))}
      <span className="text-xl font-medium ml-4" style={{ color: 'var(--caramel)' }}>{value||'-'}</span>
    </div>
  );
}

function fc(tag) {
  const m = [
    [['蓝莓','覆盆子','草莓','柑橘','橙','柠檬','苹果','葡萄','樱桃','芒果','百香果','黑醋栗','水果','莓','果'], '#E17055'],
    [['花','茉莉','玫瑰','薰衣','佛手柑'], '#E84393'],
    [['坚果','杏仁','榛果','巧克力','可可'], '#81614B'],
    [['焦糖','蜂蜜','红糖','黑糖','太妃'], '#E08A4A'],
    [['酸','明亮','果酸','上扬'], '#00B894'],
    [['苦','涩','烟','木'], '#6D5B4B'],
    [['甜','蜂蜜','糖','甘'], '#FDCB6E'],
  ];
  for (const [k,c] of m) { if (k.some(x=>tag.includes(x))) return c; }
  return '#95A5A6';
}
