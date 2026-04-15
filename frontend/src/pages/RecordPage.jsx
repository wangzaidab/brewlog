/**
 * RecordPage.jsx - 记录页面（Tab 1）
 * 核心页面：输入冲煮描述 → AI解析 → 确认/修改 → 保存到数据库
 */

import { useState } from 'react';
import { Mic, Send, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { parseBrew, saveRecord } from '../services/api';

export default function RecordPage() {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveNotifications, setSaveNotifications] = useState([]);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setError(null);
    setParseResult(null);
    setSaveSuccess(false);
    
    try {
      const result = await parseBrew(inputText);
      if (result.success) {
        setParseResult(result);
      } else {
        setError(result.error || '解析失败，请重试');
      }
    } catch (err) {
      setError('无法连接到服务器，请确认后端是否在运行');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parseResult?.parsed) return;
    setIsSaving(true);
    setError(null);  // 清除之前的错误信息
    
    try {
      const data = {
        ...parseResult.parsed,
        raw_input: inputText,
        input_type: 'text',
      };
      const result = await saveRecord(data);
      if (result.success) {
        setSaveSuccess(true);
        setSaveNotifications(result.notifications || []);
      } else {
        setError('保存失败，请重试');
      }
    } catch (err) {
      setError(`保存失败：${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('你的浏览器不支持语音输入，请使用 Chrome 浏览器');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      setInputText(prev => prev + event.results[0][0].transcript);
    };
    recognition.onerror = (event) => {
      setError('语音识别出错: ' + event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleReset = () => {
    setInputText('');
    setParseResult(null);
    setError(null);
    setSaveSuccess(false);
    setSaveNotifications([]);
  };

  return (
    <div className="px-4 pt-6">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--brew-dark)' }}>
          BrewLog
        </h1>
        <p className="text-sm mt-1 opacity-60">说一句话，记一杯咖啡</p>
      </div>

      {/* 保存成功状态 */}
      {saveSuccess && (
        <div className="animate-fade-in-up">
          <div className="text-center py-8 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(107, 143, 94, 0.1)' }}>
            <p className="text-4xl mb-3">✓</p>
            <p className="text-lg font-bold" style={{ color: 'var(--brew-success)' }}>记录已保存</p>
            <p className="text-xs mt-1 opacity-60">去「历史」页面查看所有记录</p>
          </div>
          
          {saveNotifications.map((n, i) => (
            <div key={i} className="p-3 rounded-xl text-sm mb-2" style={{ backgroundColor: 'rgba(212, 165, 116, 0.15)', color: 'var(--brew-espresso)' }}>
              🎉 {n.message}
            </div>
          ))}
          
          <button onClick={handleReset} className="w-full mt-4 py-3.5 rounded-2xl text-sm font-medium" style={{ backgroundColor: 'var(--brew-espresso)', color: 'var(--brew-cream)' }}>
            再记一杯
          </button>
        </div>
      )}

      {/* 输入区域 */}
      {!parseResult && !saveSuccess && (
        <div className="animate-fade-in-up">
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={"描述你刚冲的这杯咖啡...\n\n例如：今天冲了一杯肯尼亚浅烘水洗，15g粉用C40第22格，92度农夫山泉三段式注了225g水..."}
              className="w-full rounded-2xl p-4 pb-14 text-sm leading-relaxed resize-none transition-all duration-200"
              style={{ backgroundColor: 'var(--brew-latte)', border: '1.5px solid transparent', color: 'var(--brew-espresso)', minHeight: '180px' }}
              rows={6}
              disabled={isParsing}
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <button onClick={handleVoiceInput} disabled={isParsing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{ backgroundColor: isListening ? 'var(--brew-error)' : 'var(--brew-cream)', color: isListening ? 'white' : 'var(--brew-espresso)', opacity: isParsing ? 0.4 : 1 }}>
                <Mic size={14} className={isListening ? 'animate-pulse-soft' : ''} />
                {isListening ? '正在听...' : '语音'}
              </button>
              <button onClick={handleParse} disabled={!inputText.trim() || isParsing}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{ backgroundColor: inputText.trim() && !isParsing ? 'var(--brew-espresso)' : 'var(--brew-latte)', color: inputText.trim() && !isParsing ? 'var(--brew-cream)' : 'var(--brew-espresso)', opacity: !inputText.trim() || isParsing ? 0.4 : 1 }}>
                {isParsing ? (<><Loader2 size={14} className="animate-spin" />解析中...</>) : (<><Send size={14} />解析</>)}
              </button>
            </div>
          </div>
          {isParsing && <div className="mt-4 text-center text-sm animate-pulse-soft" style={{ color: 'var(--brew-caramel)' }}>AI 正在品味你的描述...</div>}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-3 rounded-xl flex items-start gap-2 text-sm animate-fade-in-up" style={{ backgroundColor: 'rgba(184, 92, 92, 0.1)', color: 'var(--brew-error)' }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 解析结果 */}
      {parseResult && parseResult.parsed && !saveSuccess && (
        <BrewResultCard result={parseResult} onReset={handleReset} onSave={handleSave} isSaving={isSaving} rawInput={inputText} />
      )}
    </div>
  );
}


function BrewResultCard({ result, onReset, onSave, isSaving, rawInput }) {
  const { parsed, missing_fields, notifications } = result;

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--brew-dark)' }}>解析结果</h2>
        <button onClick={onReset} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--brew-latte)', color: 'var(--brew-espresso)' }}>重新输入</button>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'white', boxShadow: '0 2px 12px rgba(92, 61, 46, 0.08)' }}>
        {/* 豆子信息 */}
        <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
          <SectionLabel text="豆子信息" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <FieldDisplay label="豆种" value={parsed.bean_name} />
            <FieldDisplay label="产地" value={parsed.origin} />
            <FieldDisplay label="处理法" value={parsed.process_method} />
            <FieldDisplay label="烘焙度" value={parsed.roast_level} />
            {parsed.roast_date && <FieldDisplay label="烘焙日期" value={parsed.roast_date} suffix={parsed.rest_days != null ? `养${parsed.rest_days}天` : null} />}
          </div>
        </div>

        {/* 冲煮参数 */}
        <div className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
          <SectionLabel text="冲煮参数" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <FieldDisplay label="方式" value={parsed.brew_method} />
            <FieldDisplay label="研磨度" value={parsed.grind_size} />
            <FieldDisplay label="粉重" value={parsed.dose_g ? `${parsed.dose_g}g` : null} />
            <FieldDisplay label="注水量" value={parsed.water_amount_g ? `${parsed.water_amount_g}g` : null} />
            {parsed.liquid_out_g && <FieldDisplay label="出液量" value={`${parsed.liquid_out_g}g`} />}
            {parsed.brew_ratio && <FieldDisplay label="粉水比" value={parsed.brew_ratio} />}
            <FieldDisplay label="水温" value={parsed.water_temp_c ? `${parsed.water_temp_c}℃` : null} />
            {parsed.brew_time && <FieldDisplay label="时间" value={parsed.brew_time} />}
          </div>
        </div>

        {/* 水质 */}
        {parsed.water_brand && (
          <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
            <SectionLabel text="水质" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <FieldDisplay label="用水" value={parsed.water_brand} />
              <FieldDisplay label="分类" value={parsed.water_category} />
              {parsed.water_tds && <FieldDisplay label="TDS" value={parsed.water_tds} />}
            </div>
          </div>
        )}

        {/* 风味 */}
        {parsed.flavor_raw && parsed.flavor_raw.length > 0 && (
          <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
            <SectionLabel text="风味" />
            <div className="mt-2 space-y-1.5">
              {parsed.flavor_raw.map((raw, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--brew-espresso)', opacity: 0.7 }}>"{raw}"</p>
              ))}
            </div>
            {parsed.flavor_tags && parsed.flavor_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {parsed.flavor_tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: getFlavorColor(tag) + '18', color: getFlavorColor(tag), border: `1px solid ${getFlavorColor(tag)}30` }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {parsed.flavor_note && (
              <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed" style={{ backgroundColor: 'var(--brew-cream)', color: 'var(--brew-espresso)', opacity: 0.8 }}>
                💬 {parsed.flavor_note}
              </div>
            )}
          </div>
        )}

        {/* 评分 */}
        {parsed.rating != null && (
          <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
            <SectionLabel text="评分" />
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-5 h-2 rounded-sm mr-0.5" style={{ backgroundColor: i < parsed.rating ? 'var(--brew-caramel)' : 'var(--brew-latte)' }} />
                ))}
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--brew-caramel)' }}>{parsed.rating}</span>
            </div>
          </div>
        )}

        {/* 备注 */}
        {parsed.notes && (
          <div className="animate-fade-in-up stagger-5" style={{ opacity: 0 }}>
            <SectionLabel text="备注" />
            <p className="text-xs mt-1 leading-relaxed opacity-70">{parsed.notes}</p>
          </div>
        )}

        {/* 缺失字段提示 - 每个字段独立展示为标签 */}
        {missing_fields && missing_fields.length > 0 && (
          <div className="animate-fade-in-up stagger-6" style={{ opacity: 0 }}>
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(122, 155, 181, 0.08)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--brew-info)' }}>以下信息你没提到，要补充吗？</p>
              <div className="flex flex-wrap gap-1.5">
                {missing_fields.map((field, i) => (
                  <span 
                    key={i} 
                    className="px-2.5 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: 'rgba(122, 155, 181, 0.12)', 
                      color: 'var(--brew-info)',
                      border: '1px dashed rgba(122, 155, 181, 0.3)',
                    }}
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 智能提示 */}
        {notifications && notifications.length > 0 && (
          <div className="animate-fade-in-up stagger-6 space-y-2" style={{ opacity: 0 }}>
            {notifications.map((n, i) => (
              <div key={i} className="p-3 rounded-xl text-xs leading-relaxed"
                style={{ backgroundColor: n.type.includes('encouragement') ? 'rgba(107, 143, 94, 0.1)' : 'rgba(212, 160, 74, 0.1)', color: n.type.includes('encouragement') ? 'var(--brew-success)' : 'var(--brew-warning)' }}>
                💡 {n.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <button onClick={onSave} disabled={isSaving}
        className="w-full mt-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200"
        style={{ backgroundColor: 'var(--brew-espresso)', color: 'var(--brew-cream)', opacity: isSaving ? 0.6 : 1 }}>
        {isSaving ? '保存中...' : '保存记录'}
      </button>

      <CollapsibleRawInput text={rawInput} />
    </div>
  );
}


function CollapsibleRawInput({ text }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-3 mb-8">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1 text-xs opacity-40 hover:opacity-60 transition-opacity">
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        查看原始输入
      </button>
      {isOpen && <p className="mt-2 text-xs leading-relaxed p-3 rounded-xl" style={{ backgroundColor: 'var(--brew-latte)', opacity: 0.7 }}>{text}</p>}
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-3.5 rounded-full" style={{ backgroundColor: 'var(--brew-caramel)' }} />
      <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--brew-dark)' }}>{text}</span>
    </div>
  );
}

function FieldDisplay({ label, value, suffix }) {
  if (!value) return null;
  return (
    <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--brew-cream)' }}>
      <span className="text-[10px] opacity-50 block">{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--brew-dark)' }}>
        {value}{suffix && <span className="text-[10px] ml-1.5 opacity-50">{suffix}</span>}
      </span>
    </div>
  );
}

function getFlavorColor(tag) {
  const map = [
    [['蓝莓','覆盆子','草莓','柑橘','橙','柠檬','苹果','葡萄','樱桃','热带','芒果','百香果','黑醋栗','水果'], '#E07B5D'],
    [['花','茉莉','玫瑰','薰衣草','佛手柑'], '#C589A3'],
    [['坚果','杏仁','榛果','巧克力','可可'], '#A0845C'],
    [['焦糖','蜂蜜','红糖','黑糖','太妃'], '#D4A04A'],
    [['酸','明亮','果酸','上扬'], '#7AAB7D'],
  ];
  for (const [keywords, color] of map) {
    if (keywords.some(k => tag.includes(k))) return color;
  }
  return '#8B7355';
}
