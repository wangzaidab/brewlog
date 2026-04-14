/**
 * DataPage.jsx - 数据看板页面（Tab 3）
 * 
 * 暂时是占位页面，Phase 2 时实现。
 */

export default function DataPage() {
  return (
    <div className="px-4 pt-6">
      <h1 
        className="font-display text-2xl font-bold"
        style={{ color: 'var(--brew-dark)' }}
      >
        数据看板
      </h1>
      <p className="text-sm mt-2 opacity-50">
        当你有了足够多的记录后，这里会展示你的口味画像。
      </p>
      
      {/* 空状态提示 */}
      <div 
        className="mt-12 text-center py-12 rounded-2xl"
        style={{ backgroundColor: 'var(--brew-latte)' }}
      >
        <p className="text-4xl mb-3">📊</p>
        <p className="text-sm font-medium" style={{ color: 'var(--brew-dark)' }}>
          数据看板建设中
        </p>
        <p className="text-xs mt-1 opacity-50">
          再记录几杯就能看到你的口味画像了
        </p>
      </div>
    </div>
  );
}
