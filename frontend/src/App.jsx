/**
 * App.jsx - 应用的根组件
 * 
 * 这个文件做两件事：
 * 1. 定义页面路由（哪个 URL 对应哪个页面）
 * 2. 渲染底部导航栏（Tab 切换）
 */

import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Coffee, ClipboardList, BarChart3 } from 'lucide-react';
import RecordPage from './pages/RecordPage';
import HistoryPage from './pages/HistoryPage';
import DataPage from './pages/DataPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--brew-cream)' }}>
        
        {/* 页面内容区域 - 占满剩余空间 */}
        <main className="flex-1 overflow-y-auto pb-20">
          <Routes>
            <Route path="/" element={<RecordPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/data" element={<DataPage />} />
          </Routes>
        </main>

        {/* 底部导航栏 - 固定在底部 */}
        <nav 
          className="fixed bottom-0 left-0 right-0 safe-bottom"
          style={{ 
            backgroundColor: 'var(--brew-cream)',
            borderTop: '1px solid var(--brew-latte)',
            maxWidth: '480px',
            margin: '0 auto',
          }}
        >
          <div className="flex justify-around items-center h-14">
            <TabButton to="/" icon={<Coffee size={22} />} label="记录" />
            <TabButton to="/history" icon={<ClipboardList size={22} />} label="历史" />
            <TabButton to="/data" icon={<BarChart3 size={22} />} label="数据" />
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
}

/**
 * 底部导航的单个按钮
 * NavLink 是 react-router-dom 提供的组件，
 * 它会自动判断当前 URL 是否匹配，匹配时添加 active 样式
 */
function TabButton({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-4 py-1 transition-colors duration-200 ${
          isActive 
            ? 'opacity-100' 
            : 'opacity-40 hover:opacity-70'
        }`
      }
      style={({ isActive }) => ({
        color: isActive ? 'var(--brew-espresso)' : 'var(--brew-espresso)',
      })}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
}
