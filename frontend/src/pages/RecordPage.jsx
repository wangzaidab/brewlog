/**
 * RecordPage.jsx - 记录页面（Tab 1）
 * 
 * 这是 BrewLog 最核心的页面。
 * 用户在这里输入冲煮描述 → 点解析 → 看到结果卡片 → 确认保存。
 * 
 * React 基础概念说明（给第一次写 React 的你）：
 * 
 * 1. useState：创建一个"状态变量"。状态变了，页面自动更新。
 *    const [count, setCount] = useState(0)
 *    → count 是当前值，setCount 是修改它的函数，0 是初始值。
 * 
 * 2. 组件：一个返回 JSX（长得像 HTML 的东西）的函数。
 *    可以像 HTML 标签一样使用：<BrewCard data={...} />
 * 
 * 3. JSX 里用 {} 插入 JavaScript 表达式：
 *    <p>{user.name}</p> 会显示 user 对象的 name 属性
 * 
 * 4. 条件渲染：{condition && <Component />}
 *    condition 为 true 时才渲染这个组件
 * 
 * 5. 列表渲染：{array.map(item => <Component key={item.id} />)}
 *    把数组里的每个元素渲染成一个组件
 */

import { useState } from 'react';
import { Mic, Send, Loader2, AlertCircle, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { parseBrew } from '../services/api';

export default function RecordPage() {
  // ---- 状态定义 ----
  // 用户输入的原始文本
  const [inputText, setInputText] = useState('');
  // 是否正在解析中（显示loading）
  const [isParsing, setIsParsing] = useState(false);
  // 解析结果
  const [parseResult, setParseResult] = useState(null);
  // 错误信息
  const [error, setError] = useState(null);
  // 是否正在语音输入
  const [isListening, setIsListening] = useState(false);

  /**
   * 处理解析请求
   * 用户点击"解析"按钮后执行
   */
  const handleParse = async () => {
    if (!inputText.trim()) return;
    
    setIsParsing(true);
    setError(null);
    setParseResult(null);
    
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

  /**
   * 处理语音输入
   * 使用浏览器原生的 Web Speech API
   */
  const handleVoiceInput = () => {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('你的浏览器不支持语音输入，请使用 Chrome 浏览器');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';           // 中文识别
    recognition.interimResults = false;    // 只要最终结果
    recognition.continuous = false;        // 说完一段就停

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + transcript);  // 追加到现有文本
    };
    
    recognition.onerror = (event) => {
      setError('语音识别出错: ' + event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  /**
   * 清空所有状态，重新开始
   */
  const handleReset = () => {
    setInputText('');
    setParseResult(null);
    setError(null);
  };

  return (
    <div className="px-4 pt-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 
          className="font-display text-3xl font-bold tracking-tight"
          style={{ color: 'var(--brew-dark)' }}
        >
          BrewLog
        </h1>
        <p className="text-sm mt-1 opacity-60">说一句话，记一杯咖啡</p>
      </div>

      {/* 输入区域 */}
      {!parseResult && (
        <div className="animate-fade-in-up">
          {/* 文本输入框 */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="描述你刚冲的这杯咖啡...&#10;&#10;例如：今天冲了一杯肯尼亚浅烘水洗，15g粉用C40第22格，92度农夫山泉三段式注了225g水..."
              className="w-full rounded-2xl p-4 pb-14 text-sm leading-relaxed resize-none transition-all duration-200"
              style={{
                backgroundColor: 'var(--brew-latte)',
                border: '1.5px solid transparent',
                color: 'var(--brew-espresso)',
                minHeight: '180px',
              }}
              rows={6}
              disabled={isParsing}
            />
            
            {/* 底部操作栏 */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              {/* 语音输入按钮 */}
              <button
                onClick={handleVoiceInput}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: isListening ? 'var(--brew-error)' : 'var(--brew-cream)',
                  color: isListening ? 'white' : 'var(--brew-espresso)',
                  opacity: isParsing ? 0.4 : 1,
                }}
              >
                <Mic size={14} className={isListening ? 'animate-pulse-soft' : ''} />
                {isListening ? '正在听...' : '语音'}
              </button>
              
              {/* 解析按钮 */}
              <button
                onClick={handleParse}
                disabled={!inputText.trim() || isParsing}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: inputText.trim() && !isParsing ? 'var(--brew-espresso)' : 'var(--brew-latte)',
                  color: inputText.trim() && !isParsing ? 'var(--brew-cream)' : 'var(--brew-espresso)',
                  opacity: !inputText.trim() || isParsing ? 0.4 : 1,
                }}
              >
                {isParsing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    解析
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 解析中的状态提示 */}
          {isParsing && (
            <div 
              className="mt-4 text-center text-sm animate-pulse-soft"
              style={{ color: 'var(--brew-caramel)' }}
            >
              AI 正在品味你的描述...
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div 
          className="mt-4 p-3 rounded-xl flex items-start gap-2 text-sm animate-fade-in-up"
          style={{ 
            backgroundColor: 'rgba(184, 92, 92, 0.1)', 
            color: 'var(--brew-error)' 
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 解析结果卡片 */}
      {parseResult && parseResult.parsed && (
        <BrewResultCard 
          result={parseResult} 
          onReset={handleReset}
          rawInput={inputText}
        />
      )}
    </div>
  );
}


/**
 * 解析结果卡片组件
 * 展示 AI 解析后的结构化数据，每个字段可编辑
 */
function BrewResultCard({ result, onReset, rawInput }) {
  const { parsed, missing_fields, notifications } = result;
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: 后续接入 Supabase 保存
    setSaved(true);
    setTimeout(() => {
      alert('记录保存成功！（数据库保存功能将在下一步实现）');
    }, 300);
  };

  return (
    <div className="animate-fade-in-up">
      {/* 顶部操作 */}
      <div className="flex items-center justify-between mb-4">
        <h2 
          className="text-lg font-bold"
          style={{ color: 'var(--brew-dark)' }}
        >
          解析结果
        </h2>
        <button
          onClick={onReset}
          className="text-xs px-3 py-1 rounded-full transition-colors duration-200"
          style={{ 
            backgroundColor: 'var(--brew-latte)',
            color: 'var(--brew-espresso)',
          }}
        >
          重新输入
        </button>
      </div>

      {/* 主卡片 */}
      <div 
        className="rounded-2xl p-5 space-y-4"
        style={{ 
          backgroundColor: 'white',
          boxShadow: '0 2px 12px rgba(92, 61, 46, 0.08)',
        }}
      >
        {/* 豆子信息区 */}
        <div className="animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
          <SectionLabel text="豆子信息" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <FieldDisplay label="豆种" value={parsed.bean_name} />
            <FieldDisplay label="产地" value={parsed.origin} />
            <FieldDisplay label="处理法" value={parsed.process_method} />
            <FieldDisplay label="烘焙度" value={parsed.roast_level} />
            {parsed.roast_date && (
              <FieldDisplay 
                label="烘焙日期" 
                value={parsed.roast_date} 
                suffix={parsed.rest_days != null ? `养${parsed.rest_days}天` : null}
              />
            )}
          </div>
        </div>

        {/* 冲煮参数区 */}
        <div className="animate-fade-in-up stagger-2" style={{ opacity: 0 }}>
          <SectionLabel text="冲煮参数" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <FieldDisplay label="方式" value={parsed.brew_method} />
            <FieldDisplay label="研磨度" value={parsed.grind_size} />
            <FieldDisplay label="粉重" value={parsed.dose_g ? `${parsed.dose_g}g` : null} />
            <FieldDisplay label="注水量" value={parsed.water_amount_g ? `${parsed.water_amount_g}g` : null} />
            {parsed.liquid_out_g && (
              <FieldDisplay label="出液量" value={`${parsed.liquid_out_g}g`} />
            )}
            {parsed.brew_ratio && (
              <FieldDisplay label="粉水比" value={parsed.brew_ratio} />
            )}
            <FieldDisplay label="水温" value={parsed.water_temp_c ? `${parsed.water_temp_c}℃` : null} />
            {parsed.brew_time && (
              <FieldDisplay label="时间" value={parsed.brew_time} />
            )}
          </div>
        </div>

        {/* 水质信息 */}
        {parsed.water_brand && (
          <div className="animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
            <SectionLabel text="水质" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <FieldDisplay label="用水" value={parsed.water_brand} />
              <FieldDisplay label="分类" value={parsed.water_category} />
            </div>
          </div>
        )}

        {/* 风味区域 - 核心差异化 */}
        {parsed.flavor_raw && parsed.flavor_raw.length > 0 && (
          <div className="animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
            <SectionLabel text="风味" />
            
            {/* 用户原话 */}
            <div className="mt-2 space-y-1.5">
              {parsed.flavor_raw.map((raw, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--brew-espresso)', opacity: 0.7 }}>
                  "{raw}"
                </p>
              ))}
            </div>

            {/* 标准风味标签 */}
            {parsed.flavor_tags && parsed.flavor_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {parsed.flavor_tags.map((tag, i) => (
                  <span 
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: getFlavorColor(tag) + '18',
                      color: getFlavorColor(tag),
                      border: `1px solid ${getFlavorColor(tag)}30`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 风味翻译说明 */}
            {parsed.flavor_note && (
              <div 
                className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
                style={{ 
                  backgroundColor: 'var(--brew-cream)',
                  color: 'var(--brew-espresso)',
                  opacity: 0.8,
                }}
              >
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
                  <div
                    key={i}
                    className="w-5 h-2 rounded-sm mr-0.5"
                    style={{
                      backgroundColor: i < parsed.rating 
                        ? 'var(--brew-caramel)' 
                        : 'var(--brew-latte)',
                    }}
                  />
                ))}
              </div>
              <span 
                className="text-sm font-bold"
                style={{ color: 'var(--brew-caramel)' }}
              >
                {parsed.rating}
              </span>
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

        {/* 缺失字段提示 */}
        {missing_fields && missing_fields.length > 0 && (
          <div 
            className="animate-fade-in-up stagger-6 p-3 rounded-xl text-xs leading-relaxed"
            style={{ 
              opacity: 0,
              backgroundColor: 'rgba(122, 155, 181, 0.1)',
              color: 'var(--brew-info)',
            }}
          >
            以下信息你没提到，要补充吗？{missing_fields.join('、')}
          </div>
        )}

        {/* 智能提示 */}
        {notifications && notifications.length > 0 && (
          <div className="animate-fade-in-up stagger-6 space-y-2" style={{ opacity: 0 }}>
            {notifications.map((n, i) => (
              <div 
                key={i}
                className="p-3 rounded-xl text-xs leading-relaxed"
                style={{ 
                  backgroundColor: n.type.includes('encouragement') 
                    ? 'rgba(107, 143, 94, 0.1)' 
                    : 'rgba(212, 160, 74, 0.1)',
                  color: n.type.includes('encouragement') 
                    ? 'var(--brew-success)' 
                    : 'var(--brew-warning)',
                }}
              >
                💡 {n.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={saved}
        className="w-full mt-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: saved ? 'var(--brew-success)' : 'var(--brew-espresso)',
          color: 'var(--brew-cream)',
          opacity: saved ? 0.8 : 1,
        }}
      >
        {saved ? '✓ 已保存' : '保存记录'}
      </button>

      {/* 原始输入（可折叠） */}
      <CollapsibleRawInput text={rawInput} />
    </div>
  );
}


/**
 * 可折叠的原始输入展示
 */
function CollapsibleRawInput({ text }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mt-3 mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs opacity-40 hover:opacity-60 transition-opacity"
      >
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        查看原始输入
      </button>
      {isOpen && (
        <p 
          className="mt-2 text-xs leading-relaxed p-3 rounded-xl"
          style={{ backgroundColor: 'var(--brew-latte)', opacity: 0.7 }}
        >
          {text}
        </p>
      )}
    </div>
  );
}


/**
 * 区域标签组件
 */
function SectionLabel({ text }) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-1 h-3.5 rounded-full" 
        style={{ backgroundColor: 'var(--brew-caramel)' }} 
      />
      <span 
        className="text-xs font-bold tracking-wide"
        style={{ color: 'var(--brew-dark)' }}
      >
        {text}
      </span>
    </div>
  );
}


/**
 * 单个字段展示组件
 */
function FieldDisplay({ label, value, suffix }) {
  if (!value) return null;
  
  return (
    <div 
      className="px-3 py-2 rounded-xl"
      style={{ backgroundColor: 'var(--brew-cream)' }}
    >
      <span className="text-[10px] opacity-50 block">{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--brew-dark)' }}>
        {value}
        {suffix && (
          <span className="text-[10px] ml-1.5 opacity-50">{suffix}</span>
        )}
      </span>
    </div>
  );
}


/**
 * 根据风味类型返回对应颜色
 */
function getFlavorColor(tag) {
  const fruitKeywords = ['蓝莓', '覆盆子', '草莓', '柑橘', '橙', '柠檬', '苹果', '葡萄', '樱桃', '热带', '芒果', '百香果', '红糖', '黑醋栗', '水果'];
  const floralKeywords = ['花', '茉莉', '玫瑰', '薰衣草', '佛手柑'];
  const nuttyKeywords = ['坚果', '杏仁', '榛果', '巧克力', '可可'];
  const sweetKeywords = ['焦糖', '蜂蜜', '红糖', '黑糖', '太妃'];
  const acidKeywords = ['酸', '明亮', '果酸', '上扬'];
  
  if (fruitKeywords.some(k => tag.includes(k))) return '#E07B5D';
  if (floralKeywords.some(k => tag.includes(k))) return '#C589A3';
  if (nuttyKeywords.some(k => tag.includes(k))) return '#A0845C';
  if (sweetKeywords.some(k => tag.includes(k))) return '#D4A04A';
  if (acidKeywords.some(k => tag.includes(k))) return '#7AAB7D';
  return '#8B7355';  // 默认咖啡色
}
