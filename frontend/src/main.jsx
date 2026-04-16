/**
 * main.jsx - 应用的启动文件
 * 
 * 这个文件做的事情很简单：
 * 把 React 的根组件（App）挂载到 HTML 页面上的 #root 元素里。
 * 
 * 你几乎不需要改这个文件。
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css';
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
