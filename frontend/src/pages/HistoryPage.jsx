/**
 * HistoryPage.jsx - 历史记录页面（Tab 2）
 * 
 * 暂时是占位页面，后续接入 Supabase 后会展示真实数据。
 */

export default function HistoryPage() {
  return (
    <div className="px-4 pt-6">
      <h1 
        className="font-display text-2xl font-bold"
        style={{ color: 'var(--brew-dark)' }}
      >
        冲煮历史
      </h1>
      <p className="text-sm mt-2 opacity-50">
        记录保存功能即将上线，你的冲煮记录会在这里展示。
      </p>
      
      {/* 空状态提示 */}
      <div 
        className="mt-12 text-center py-12 rounded-2xl"
        style={{ backgroundColor: 'var(--brew-latte)' }}
      >
        <p className="text-4xl mb-3">☕</p>
        <p className="text-sm font-medium" style={{ color: 'var(--brew-dark)' }}>
          还没有记录
        </p>
        <p className="text-xs mt-1 opacity-50">
          去「记录」页面冲一杯吧
        </p>
      </div>
    </div>
  );
}
