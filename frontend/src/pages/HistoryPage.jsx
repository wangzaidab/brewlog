/**
 * HistoryPage.jsx - 历史记录页面（Tab 2）
 * 展示用户保存的所有冲煮记录，支持搜索和筛选
 */

import { useState, useEffect } from 'react';
import { Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getRecords, deleteRecord } from '../services/api';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roastFilter, setRoastFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // 页面加载时获取记录
  useEffect(() => {
    fetchRecords();
  }, [roastFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const result = await getRecords(1, 50, search, roastFilter);
      if (result.success) {
        setRecords(result.records);
      }
    } catch (err) {
      console.error('获取记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 搜索时按回车触发
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      fetchRecords();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await deleteRecord(id);
      setRecords(records.filter(r => r.id !== id));
    } catch (err) {
      alert('删除失败');
    }
  };

  const roastOptions = ['', '浅烘', '中烘', '中深', '深烘'];

  return (
    <div className="px-4 pt-6">
      <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--brew-dark)' }}>
        冲煮历史
      </h1>

      {/* 搜索和筛选 */}
      <div className="mt-4 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="搜索豆种、产地..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--brew-latte)', border: '1.5px solid transparent', color: 'var(--brew-espresso)' }}
          />
        </div>
        
        <div className="flex gap-1.5">
          {roastOptions.map((opt) => (
            <button
              key={opt || 'all'}
              onClick={() => setRoastFilter(opt)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: roastFilter === opt ? 'var(--brew-espresso)' : 'var(--brew-latte)',
                color: roastFilter === opt ? 'var(--brew-cream)' : 'var(--brew-espresso)',
              }}
            >
              {opt || '全部'}
            </button>
          ))}
        </div>
      </div>

      {/* 记录列表 */}
      <div className="mt-4 space-y-3 pb-8">
        {loading ? (
          <div className="text-center py-12 opacity-50 text-sm">加载中...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--brew-latte)' }}>
            <p className="text-4xl mb-3">☕</p>
            <p className="text-sm font-medium" style={{ color: 'var(--brew-dark)' }}>还没有记录</p>
            <p className="text-xs mt-1 opacity-50">去「记录」页面冲一杯吧</p>
          </div>
        ) : (
          records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              isExpanded={expandedId === record.id}
              onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
              onDelete={() => handleDelete(record.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}


function RecordCard({ record, isExpanded, onToggle, onDelete }) {
  const createdDate = record.created_at ? new Date(record.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '';
  const flavorTags = Array.isArray(record.flavor_tags) ? record.flavor_tags : [];

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-200"
      style={{ backgroundColor: 'white', boxShadow: '0 1px 6px rgba(92, 61, 46, 0.06)' }}
    >
      {/* 主要信息（始终显示） */}
      <div className="flex items-start justify-between" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-40">{createdDate}</span>
            <span className="text-sm font-bold" style={{ color: 'var(--brew-dark)' }}>
              {record.bean_name || '未知豆种'}
            </span>
            {record.process_method && (
              <span className="text-xs opacity-50">{record.process_method}</span>
            )}
            {record.roast_level && (
              <span className="text-xs opacity-50">{record.roast_level}</span>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1.5 text-xs opacity-60">
            {record.water_temp_c && <span>{record.water_temp_c}℃</span>}
            {record.brew_ratio && <span>{record.brew_ratio}</span>}
            {record.rest_days != null && <span>养{record.rest_days}天</span>}
          </div>

          {/* 风味标签 */}
          {flavorTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {flavorTags.slice(0, 4).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{ backgroundColor: 'var(--brew-latte)', color: 'var(--brew-espresso)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 评分和展开 */}
        <div className="flex items-center gap-2 ml-2">
          {record.rating != null && (
            <span className="text-lg font-bold" style={{ color: 'var(--brew-caramel)' }}>
              {record.rating}
            </span>
          )}
          {isExpanded ? <ChevronUp size={16} className="opacity-30" /> : <ChevronDown size={16} className="opacity-30" />}
        </div>
      </div>

      {/* 展开的详细信息 */}
      {isExpanded && (
        <div className="mt-3 pt-3 space-y-2 animate-fade-in-up" style={{ borderTop: '1px solid var(--brew-latte)' }}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {record.brew_method && <DetailRow label="方式" value={record.brew_method} />}
            {record.grind_size && <DetailRow label="研磨" value={record.grind_size} />}
            {record.dose_g && <DetailRow label="粉重" value={`${record.dose_g}g`} />}
            {record.water_amount_g && <DetailRow label="注水" value={`${record.water_amount_g}g`} />}
            {record.liquid_out_g && <DetailRow label="出液" value={`${record.liquid_out_g}g`} />}
            {record.brew_time && <DetailRow label="时间" value={record.brew_time} />}
            {record.water_brand && <DetailRow label="用水" value={record.water_brand} />}
            {record.roast_date && <DetailRow label="烘焙日期" value={record.roast_date} />}
          </div>

          {/* 风味翻译 */}
          {record.flavor_note && (
            <div className="p-2.5 rounded-xl text-xs leading-relaxed" style={{ backgroundColor: 'var(--brew-cream)', opacity: 0.8 }}>
              💬 {record.flavor_note}
            </div>
          )}

          {/* 备注 */}
          {record.notes && (
            <p className="text-xs opacity-60">{record.notes}</p>
          )}

          {/* 删除按钮 */}
          <div className="flex justify-end pt-1">
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--brew-error)' }}>
              <Trash2 size={12} /> 删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function DetailRow({ label, value }) {
  return (
    <div>
      <span className="opacity-40">{label}: </span>
      <span style={{ color: 'var(--brew-dark)' }}>{value}</span>
    </div>
  );
}
