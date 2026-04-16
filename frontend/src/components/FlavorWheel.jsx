import { useState } from 'react';

const FLAVORS = [
  { name: '花香', color: '#E84393', subs: ['茉莉', '玫瑰', '薰衣草', '橙花', '白色花香', '洋甘菊'] },
  { name: '水果', color: '#E17055', subs: ['蓝莓', '覆盆子', '草莓', '黑莓', '水蜜桃', '柑橘', '柠檬', '苹果', '樱桃', '芒果', '百香果', '黑醋栗'] },
  { name: '酸质', color: '#00B894', subs: ['明亮', '上扬', '活泼', '柔和', '果酸', '乳酸', '柠檬酸'] },
  { name: '甜感', color: '#FDCB6E', subs: ['蜂蜜', '红糖', '黑糖', '焦糖', '枫糖', '甘蔗', '回甘'] },
  { name: '坚果', color: '#81614B', subs: ['杏仁', '榛果', '核桃', '花生', '巧克力', '可可', '黑巧克力'] },
  { name: '焦糖', color: '#E08A4A', subs: ['焦糖', '太妃', '奶油糖', '烤地瓜', '麦芽', '烤棉花糖'] },
  { name: '香料', color: '#D35E5E', subs: ['肉桂', '丁香', '八角', '胡椒', '姜', '豆蔻'] },
  { name: '烘烤', color: '#6D5B4B', subs: ['烟熏', '木质', '雪松', '烟草', '碳烤', '谷物'] },
  { name: '其他', color: '#95A5A6', subs: ['醇厚', '顺滑', '轻盈', '干净', '复杂', '平衡'] },
];

const KEYWORD_MAP = {
  '花香': ['花','茉莉','玫瑰','薰衣','橙花','洋甘菊','佛手柑','花香'],
  '水果': ['蓝莓','覆盆子','草莓','柑橘','橙','柠檬','苹果','葡萄','樱桃','芒果','百香果','黑醋栗','黑莓','水蜜桃','水果','莓','果','桃'],
  '酸质': ['酸','明亮','果酸','上扬','活泼','乳酸','柠檬酸'],
  '甜感': ['甜','蜂蜜','糖','甘','回甘','红糖','黑糖','枫糖'],
  '坚果': ['坚果','杏仁','榛果','巧克力','可可','核桃','花生'],
  '焦糖': ['焦糖','太妃','奶油糖','烤地瓜','烤红薯','麦芽','棉花糖'],
  '香料': ['肉桂','丁香','八角','胡椒','姜','豆蔻','香料'],
  '烘烤': ['烟熏','木质','雪松','烟草','碳烤','谷物','烟','木','烘烤'],
  '其他': ['醇厚','顺滑','轻盈','干净','复杂','平衡','苦','涩'],
};

function analyzeTags(tags) {
  const result = new Map();
  FLAVORS.forEach(f => {
    result.set(f.name, { mentioned: new Set(), notMentioned: new Set(f.subs), isActive: false });
  });
  if (!tags) return result;
  
  tags.forEach(tag => {
    for (const [catName, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some(k => tag.includes(k))) {
        const cat = result.get(catName);
        if (cat) {
          cat.isActive = true;
          const catData = FLAVORS.find(f => f.name === catName);
          catData.subs.forEach(sub => {
            if (tag.includes(sub) || sub.includes(tag)) {
              cat.mentioned.add(sub);
              cat.notMentioned.delete(sub);
            }
          });
          if (cat.mentioned.size === 0) {
            cat.mentioned.add(tag);
          }
        }
      }
    }
  });
  return result;
}

export default function FlavorWheel({ tags }) {
  const [expanded, setExpanded] = useState(null);
  const analysis = analyzeTags(tags);
  
  const size = 300;
  const cx = size / 2, cy = size / 2;
  const R1 = 52;
  const R2 = 122;
  const seg = 360 / FLAVORS.length;
  
  const expandedData = expanded ? analysis.get(expanded) : null;
  const expandedFlavor = expanded ? FLAVORS.find(f => f.name === expanded) : null;

  return (
    <div className="w-full flex flex-col items-center">
      {/* 风味轮SVG - 固定高度，撑开容器 */}
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {FLAVORS.map(f => (
              <filter key={f.name} id={`glow-${f.name}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {FLAVORS.map((f, i) => {
            const catData = analysis.get(f.name);
            const isActive = catData.isActive;
            const isExp = expanded === f.name;
            const a1 = (i * seg - 90) * Math.PI / 180;
            const a2 = ((i + 1) * seg - 90) * Math.PI / 180;
            const mid = ((i + 0.5) * seg - 90) * Math.PI / 180;
            const curR = isExp ? R2 + 10 : R2;
            
            const path = arcPath(cx, cy, R1, curR, a1, a2);
            const labelR = (curR + R1) / 2;
            const lx = cx + labelR * Math.cos(mid);
            const ly = cy + labelR * Math.sin(mid);

            return (
              <g key={f.name}
                onClick={() => isActive && setExpanded(isExp ? null : f.name)}
                style={{ cursor: isActive ? 'pointer' : 'default' }}>
                <path d={path}
                  fill={isActive ? f.color : '#EDE8E0'}
                  stroke="#FFFDFB"
                  strokeWidth="2"
                  filter={isActive ? `url(#glow-${f.name})` : 'none'}
                  style={{ 
                    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    opacity: isActive ? 1 : 0.4,
                  }}
                />
                <text 
                  x={lx} y={ly} 
                  textAnchor="middle" 
                  dominantBaseline="central"
                  style={{
                    fontSize: '12px',
                    fontFamily: "'Poppins', 'Noto Sans SC', sans-serif",
                    fontWeight: isActive ? 600 : 400,
                    fill: isActive ? '#ffffff' : '#B5AA9C',
                    transition: 'all 0.3s ease',
                    pointerEvents: 'none',
                    letterSpacing: '0.02em',
                  }}>
                  {f.name}
                </text>
              </g>
            );
          })}

          <circle cx={cx} cy={cy} r={R1 - 4} fill="#FFFDFB" />
          <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: '15px', fontFamily: "'Lora', 'Noto Serif SC', serif", fontWeight: 600, fill: '#A67B5B' }}>
            风味
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: '8px', fill: '#CEC4B7', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.1em' }}>
            tap to explore
          </text>
        </svg>
      </div>

      {/* 展开的详情面板 */}
      {expanded && expandedFlavor && expandedData && (
        <div className="w-full mt-6 px-5 py-4 rounded-3xl anim-fade-up" 
          style={{ background: expandedFlavor.color + '08', border: `1px solid ${expandedFlavor.color}20` }}>
          
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-serif text-base font-semibold" style={{ color: expandedFlavor.color }}>
              {expandedFlavor.name}
            </h4>
            <button onClick={() => setExpanded(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              收起
            </button>
          </div>

          {expandedData.mentioned.size > 0 && (
            <div className="mb-4">
              <p className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>
                你描述的
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(expandedData.mentioned).map(sub => (
                  <span key={sub} className="px-3 py-1.5 rounded-full text-xs font-medium" 
                    style={{ background: expandedFlavor.color, color: '#fff' }}>
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}

          {expandedData.notMentioned.size > 0 && (
            <div>
              <p className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>
                这个类别还包含
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(expandedData.notMentioned).map(sub => (
                  <span key={sub} className="px-3 py-1.5 rounded-full text-xs" 
                    style={{ background: 'transparent', color: expandedFlavor.color, border: `1px dashed ${expandedFlavor.color}60` }}>
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function arcPath(cx, cy, r1, r2, a1, a2) {
  const x1o = cx + r2 * Math.cos(a1), y1o = cy + r2 * Math.sin(a1);
  const x2o = cx + r2 * Math.cos(a2), y2o = cy + r2 * Math.sin(a2);
  const x1i = cx + r1 * Math.cos(a1), y1i = cy + r1 * Math.sin(a1);
  const x2i = cx + r1 * Math.cos(a2), y2i = cy + r1 * Math.sin(a2);
  return `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${r2} ${r2} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${r1} ${r1} 0 0 0 ${x1i} ${y1i}`;
}
