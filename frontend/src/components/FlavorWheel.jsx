import { useState } from 'react';

const FLAVORS = [
  { name: '花香', color: '#E84393', subs: ['茉莉','玫瑰','薰衣草','橙花','洋甘菊','佛手柑'] },
  { name: '水果', color: '#E17055', subs: ['蓝莓','覆盆子','草莓','黑醋栗','柑橘','柠檬','苹果','樱桃','芒果','百香果','桃','葡萄'] },
  { name: '酸质', color: '#00B894', subs: ['明亮','上扬','活泼','柔和','果酸','乳酸'] },
  { name: '甜感', color: '#FDCB6E', subs: ['蜂蜜','红糖','黑糖','枫糖','甘蔗','回甘'] },
  { name: '坚果', color: '#81614B', subs: ['杏仁','榛果','核桃','花生','巧克力','可可','黑巧克力'] },
  { name: '焦糖', color: '#E08A4A', subs: ['焦糖','太妃','奶油糖','烤地瓜','麦芽','烤棉花糖'] },
  { name: '香料', color: '#D35E5E', subs: ['肉桂','丁香','八角','胡椒','姜','豆蔻'] },
  { name: '烘烤', color: '#6D5B4B', subs: ['烟熏','木质','雪松','烟草','碳烤','谷物'] },
  { name: '其他', color: '#95A5A6', subs: ['醇厚','顺滑','轻盈','干净','复杂','平衡'] },
];

const KEYWORD_MAP = {
  '花香': ['花','茉莉','玫瑰','薰衣','橙花','洋甘菊','佛手柑','花香'],
  '水果': ['蓝莓','覆盆子','草莓','柑橘','橙','柠檬','苹果','葡萄','樱桃','芒果','百香果','黑醋栗','水果','莓','果','桃'],
  '酸质': ['酸','明亮','果酸','上扬','活泼','乳酸'],
  '甜感': ['甜','蜂蜜','糖','甘','回甘'],
  '坚果': ['坚果','杏仁','榛果','巧克力','可可','核桃','花生'],
  '焦糖': ['焦糖','太妃','奶油糖','烤地瓜','烤红薯','麦芽','棉花糖'],
  '香料': ['肉桂','丁香','八角','胡椒','姜','豆蔻','香料'],
  '烘烤': ['烟熏','木质','雪松','烟草','碳烤','谷物','烟','木','烘烤'],
  '其他': ['醇厚','顺滑','轻盈','干净','复杂','平衡','苦','涩'],
};

function getActiveCategories(tags) {
  const active = new Map();
  if (!tags) return active;
  tags.forEach(tag => {
    for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some(k => tag.includes(k))) {
        if (!active.has(cat)) active.set(cat, []);
        active.get(cat).push(tag);
      }
    }
  });
  return active;
}

export default function FlavorWheel({ tags }) {
  const [expanded, setExpanded] = useState(null);
  const active = getActiveCategories(tags);
  
  if (!tags || tags.length === 0) return null;
  
  const size = 280;
  const cx = size / 2, cy = size / 2;
  const R1 = 46, R2 = 108;
  const seg = 360 / FLAVORS.length;
  
  return (
    <div className="flex flex-col items-center" style={{ padding: '8px 0' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          {FLAVORS.map(f => (
            <filter key={f.name} id={`glow-${f.name}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {FLAVORS.map((f, i) => {
          const isActive = active.has(f.name);
          const isExp = expanded === f.name;
          const a1 = (i * seg - 90) * Math.PI / 180;
          const a2 = ((i + 1) * seg - 90) * Math.PI / 180;
          const mid = ((i + 0.5) * seg - 90) * Math.PI / 180;
          const curR = isExp ? R2 + 14 : R2;
          
          const path = arcPath(cx, cy, R1, curR, a1, a2);
          const lx = cx + ((curR + R1) / 2) * Math.cos(mid);
          const ly = cy + ((curR + R1) / 2) * Math.sin(mid);

          return (
            <g key={f.name} 
              onClick={() => isActive && setExpanded(isExp ? null : f.name)}
              style={{ cursor: isActive ? 'pointer' : 'default' }}>
              <path d={path}
                fill={isActive ? f.color : '#EDE8E0'}
                stroke={isActive ? f.color : '#E5DFD6'}
                strokeWidth={isActive ? 0 : 0.5}
                filter={isActive ? `url(#glow-${f.name})` : 'none'}
                style={{ 
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  opacity: isActive ? 0.92 : 0.35,
                }}
              />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                style={{
                  fontSize: '10px',
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: isActive ? 600 : 400,
                  fill: isActive ? '#fff' : '#C5BCB0',
                  transition: 'all 0.3s ease',
                  pointerEvents: 'none',
                  textShadow: isActive ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                }}>
                {f.name}
              </text>

              {isExp && isActive && (active.get(f.name) || []).map((sub, j) => {
                const total = (active.get(f.name) || []).length;
                const subA = (i * seg + seg * (j + 0.5) / total - 90) * Math.PI / 180;
                const subR = curR + 28;
                return (
                  <g key={sub}>
                    <circle cx={cx + subR * Math.cos(subA)} cy={cy + subR * Math.sin(subA)} 
                      r="16" fill={f.color} opacity="0.85"
                      style={{ filter: `url(#glow-${f.name})` }} />
                    <text x={cx + subR * Math.cos(subA)} y={cy + subR * Math.sin(subA)}
                      textAnchor="middle" dominantBaseline="central"
                      style={{ fontSize: '8px', fill: '#fff', fontWeight: 500, fontFamily: "'Noto Sans SC', sans-serif", pointerEvents: 'none' }}>
                      {sub.length > 3 ? sub.slice(0,3) : sub}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r={R1 - 4} fill="var(--bg-card, #FFFCF7)" />
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: '13px', fontFamily: "'Lora', serif", fontWeight: 600, fill: 'var(--caramel, #A67B5B)' }}>
          风味
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: '7px', fill: 'var(--text-hint, #CEC4B7)', fontFamily: "'Poppins', sans-serif" }}>
          tap to explore
        </text>
      </svg>
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
