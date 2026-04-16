import { useState } from 'react';
import { Mic, Camera, Loader2, AlertCircle, Pencil, Check, X, Coffee, Droplet, Flame, Leaf, BookOpen, Star, Info, Sparkles } from 'lucide-react';
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
      if (r.success) {
        // 「我的笔记」预填用户原文的风味描述（不包含 AI 的翻译和建议）
        let userNotesDraft = '';
        if (r.parsed.flavor_raw?.length > 0) {
          userNotesDraft = r.parsed.flavor_raw.map(s => `"${s}"`).join('\n');
        }
        if (r.parsed.notes) {
          userNotesDraft = userNotesDraft 
            ? `${userNotesDraft}\n\n${r.parsed.notes}` 
            : r.parsed.notes;
        }
        
        setParseResult(r);
        setEditedData({ 
          ...r.parsed, 
          notes: userNotesDraft  // 只放用户表达的内容
          // flavor_note 保留 AI 原始返回，不合并到 notes
        });
      }
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
  const reset = () => { setInputText(''); setParseResult(null); setEditedData(null); setError(null); setSaveSuccess(false); setSaveNotifications([]); };

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

  /* ===== 保存成功 ===== */
  if (saveSuccess) return (
    <div className="px-6 pt-24 min-h-screen">
      <div className="text-center py-16 rounded-[2rem] bg-card shadow-sm border border-border">
        <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-primary text-primary-foreground">
          <Check size={28} />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">记录已保存</h2>
        <p className="text-sm mt-3 text-muted-foreground">去「历史」查看</p>
      </div>
      {saveNotifications.map((n,i)=>(
        <div key={i} className="mt-4 py-4 px-6 rounded-2xl text-sm bg-accent/20 text-secondary">🎉 {n.message}</div>
      ))}
      <button onClick={reset} className="w-full mt-8 py-5 rounded-full text-base font-medium bg-primary text-primary-foreground shadow-lg active:scale-[0.98] transition-transform">
        再记一杯
      </button>
    </div>
  );

  /* ===== 解析结果 ===== */
  if (parseResult && editedData) {
    const hasAiContent = editedData.flavor_note || (parseResult.notifications && parseResult.notifications.length > 0);
    
    return (
      <div className="px-5 pt-16 pb-40">
        <div className="text-center mb-8 relative">
          <h2 className="font-serif text-2xl font-bold text-foreground tracking-wide">记录详情</h2>
          <button onClick={reset} className="absolute right-2 top-0 text-xs px-4 py-2 rounded-full bg-muted text-muted-foreground transition-colors hover:bg-border">重新输入</button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        <FlavorWheel tags={editedData.flavor_tags} />

        <Card icon={<Coffee size={18} strokeWidth={2} />} title="咖啡豆信息" i={0}>
          <Row label="品牌" value={editedData.brand} onChange={v=>upd('brand',v)} />
          <Row label="名称" value={editedData.bean_name} onChange={v=>upd('bean_name',v)} />
          <Row label="烘焙度" value={editedData.roast_level} onChange={v=>upd('roast_level',v)} />
          <Row label="产地" value={editedData.origin} onChange={v=>upd('origin',v)} />
          <Row label="处理法" value={editedData.process_method} onChange={v=>upd('process_method',v)} last />
        </Card>

        <Card icon={<Droplet size={18} strokeWidth={2} />} title="水的信息" i={1}>
          <Row label="水温" value={editedData.water_temp_c!=null?`${editedData.water_temp_c}°C`:null} onChange={v=>upd('water_temp_c',v?parseFloat(v.replace('°C','')):null)} />
          <Row label="粉水比" value={editedData.brew_ratio} onChange={v=>upd('brew_ratio',v)} />
          <Row label="注水量" value={editedData.water_amount_g!=null?`${editedData.water_amount_g}ml`:null} onChange={v=>upd('water_amount_g',v?parseFloat(v.replace(/[a-z]/gi,'')):null)} />
          <Row label="粉重" value={editedData.dose_g!=null?`${editedData.dose_g}g`:null} onChange={v=>upd('dose_g',v?parseFloat(v.replace('g','')):null)} />
          <Row label="出液量" value={editedData.liquid_out_g!=null?`${editedData.liquid_out_g}g`:null} onChange={v=>upd('liquid_out_g',v?parseFloat(v.replace('g','')):null)} last />
        </Card>

        <Card icon={<Flame size={18} strokeWidth={2} />} title="冲煮方案" i={2}>
          <Row label="方式" value={editedData.brew_method} onChange={v=>upd('brew_method',v)} />
          <Row label="研磨度" value={editedData.grind_size} onChange={v=>upd('grind_size',v)} />
          <Row label="时间" value={editedData.brew_time} onChange={v=>upd('brew_time',v)} last />
        </Card>

        {/* 风味标签（AI解析后的风味关键词） */}
        {editedData.flavor_tags?.length > 0 && (
          <Card icon={<Leaf size={18} strokeWidth={2} />} title="风味标签" i={3}>
            <div className="flex flex-wrap gap-2">
              {editedData.flavor_tags.map((t,i)=>(
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">{t}</span>
              ))}
            </div>
          </Card>
        )}

        {/* 评分 */}
        <Card icon={<Star size={18} />} title="评分" i={4}>
          <Stars value={editedData.rating} onChange={v => upd('rating', v)} />
        </Card>

        {/* BrewLog 的小记 - 人格化，不强调 AI */}
        {hasAiContent && (
          <AiCard i={5}>
            {editedData.flavor_note && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-primary"></div>
                  <span className="text-xs font-semibold text-primary tracking-wide">这杯咖啡的风味</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80 pl-3">
                  {editedData.flavor_note}
                </p>
              </div>
            )}

            {parseResult.notifications?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-secondary"></div>
                  <span className="text-xs font-semibold text-secondary tracking-wide">一点小建议</span>
                </div>
                <div className="space-y-2.5 pl-3">
                  {parseResult.notifications.map((n,i)=>{
                    const prefix = 
                      n.type === 'cheer' ? '💪' :
                      n.type === 'warning' ? '⚠️' :
                      n.type === 'milestone' ? '🎉' :
                      n.type === 'tip' ? '💡' : '·';
                    return (
                      <p key={i} className="text-sm leading-relaxed text-foreground/80">
                        {prefix} {n.message}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </AiCard>
        )}

        {/* 我的笔记（预填用户原话，用户可自由修改） */}
        <Card icon={<BookOpen size={18} strokeWidth={2} />} title="我的笔记" i={6}>
          <textarea 
            value={editedData.notes || ''} 
            onChange={e => upd('notes', e.target.value)}
            placeholder="记录一下这次冲煮的心得、感受或下次想调整的地方..."
            className="w-full p-4 rounded-2xl text-sm leading-relaxed bg-background text-foreground border border-border focus:outline-none focus:border-primary transition-colors resize-none"
            rows={5}
          />
        </Card>

        <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-6 bg-gradient-to-t from-background via-background to-transparent">
          <div className="flex gap-4 max-w-md mx-auto mb-3">
            <button onClick={reset} className="flex-1 py-4 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-border transition-colors">取消</button>
            <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-4 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all">
              {isSaving ? '保存中...' : '确认记录'}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1 text-center">
            <Info size={10} /> 所有内容均可自由修改
          </p>
        </div>
      </div>
    );
  }

  /* ===== 录入首页 ===== */
  return (
    <div className="px-6 pt-24 min-h-screen flex flex-col">
      <div className="text-center mb-12">
        <h1 className="font-serif text-5xl font-bold text-primary tracking-tight mb-4">BrewLog</h1>
        <p className="text-xs font-medium tracking-[0.2em] text-secondary uppercase">一句话记好咖啡</p>
      </div>

      <textarea value={inputText} onChange={e=>setInputText(e.target.value)} disabled={isParsing}
        placeholder="记录你的咖啡体验..."
        className="w-full rounded-[2rem] p-6 text-base leading-relaxed resize-none mb-6 bg-card text-foreground shadow-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        rows={5} />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={handleVoice} disabled={isParsing}
          className={`flex flex-col items-center justify-center gap-4 py-8 rounded-[2rem] transition-all active:scale-[0.98] border ${isListening ? 'bg-destructive/10 border-destructive/20' : 'bg-card border-border shadow-sm'}`}>
          <Mic size={28} className={isListening ? 'text-destructive animate-pulse' : 'text-primary'} />
          <span className="text-sm font-medium text-muted-foreground">{isListening ? '正在听...' : '语音输入'}</span>
        </button>
        <button disabled={isParsing} onClick={()=>setError('照片识别即将上线')}
          className="flex flex-col items-center justify-center gap-4 py-8 rounded-[2rem] bg-card border border-border shadow-sm transition-all active:scale-[0.98]">
          <Camera size={28} className="text-primary" />
          <span className="text-sm font-medium text-muted-foreground">添加照片</span>
        </button>
      </div>

      <button onClick={handleParse} disabled={!inputText.trim()||isParsing}
        className={`w-full py-5 rounded-full text-base font-medium transition-all active:scale-[0.98] shadow-md flex justify-center items-center gap-2 ${inputText.trim() && !isParsing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        {isParsing && <Loader2 size={18} className="animate-spin" />}
        {isParsing ? '解析中...' : '开始记录'}
      </button>

      {error && <div className="mt-6 p-4 rounded-2xl flex items-start gap-3 text-sm bg-destructive/10 text-destructive border border-destructive/20"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
    </div>
  );
}

/* ===== 组件区 ===== */

function Card({ title, icon, children, i=0 }) {
  return (
    <div className="rounded-[2rem] p-6 mb-6 bg-card shadow-sm border border-border animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i*100}ms`, animationFillMode: 'both' }}>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-primary">{icon}</span>
        <h3 className="text-base font-bold text-foreground font-serif">{title}</h3>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

/* BrewLog 小记卡片 - 产品人格化，不强调 AI */
function AiCard({ children, i=0 }) {
  return (
    <div 
      className="rounded-[2rem] p-6 mb-6 animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden" 
      style={{ 
        animationDelay: `${i*100}ms`, 
        animationFillMode: 'both',
        background: 'linear-gradient(135deg, rgba(53,92,79,0.04) 0%, rgba(166,123,91,0.04) 100%)',
        border: '1px solid rgba(53,92,79,0.1)',
      }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={18} strokeWidth={2} className="text-primary" />
        <h3 className="text-base font-bold text-foreground font-serif">BrewLog 小记</h3>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({ label, value, onChange, last=false }) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState('');
  const startEdit = () => { setTmp(value??''); setEditing(true); };
  const ok = () => { onChange(tmp||null); setEditing(false); };
  
  if (editing) return (
    <div className={`flex items-center justify-between py-4 ${last ? '' : 'border-b border-border'}`}>
      <span className="text-sm w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 flex-1">
        <input type="text" value={tmp} onChange={e=>setTmp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ok();if(e.key==='Escape')setEditing(false);}} autoFocus className="text-sm text-right bg-transparent w-full outline-none text-foreground border-b-2 border-primary focus:border-primary px-1" />
        <button onClick={ok} className="p-1 text-primary hover:bg-primary/10 rounded"><Check size={16} /></button>
        <button onClick={()=>setEditing(false)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><X size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className={`flex items-center justify-between py-4 cursor-pointer group ${last ? '' : 'border-b border-border'}`} onClick={startEdit}>
      <span className="text-sm w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 flex items-center justify-end gap-2">
        <span className={`text-sm text-right ${value ? 'text-foreground font-medium' : 'text-muted-foreground italic font-light'}`}>{value || '点击填写'}</span>
        <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 py-2">
      {[1,2,3,4,5].map(s => {
        const isActive = value && value / 2 >= s;
        return (
          <button key={s} onClick={()=>onChange(s*2)} className="outline-none active:scale-110 transition-transform">
            <svg width="28" height="28" viewBox="0 0 24 24" fill={isActive ? 'var(--secondary)' : 'transparent'} stroke={isActive ? 'var(--secondary)' : 'var(--muted)'} strokeWidth="1.5" className="transition-colors duration-300"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>
        );
      })}
      <span className="text-lg font-bold ml-4 text-secondary font-serif">{value ? (value/2).toFixed(1) : '-'}</span>
    </div>
  );
}
