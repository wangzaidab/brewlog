/**
 * BrewLog API 服务层
 */

const API_BASE = '/api/v1';

/** 解析冲煮描述 */
export async function parseBrew(rawInput, inputType = 'text') {
  const response = await fetch(`${API_BASE}/brew/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_input: rawInput, input_type: inputType }),
  });
  if (!response.ok) throw new Error(`解析请求失败: ${response.status}`);
  return response.json();
}

/** 保存冲煮记录 */
export async function saveRecord(data) {
  const response = await fetch(`${API_BASE}/brew/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`保存失败: ${response.status}`);
  return response.json();
}

/** 获取记录列表 */
export async function getRecords(page = 1, limit = 20, search = '', roastLevel = '') {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  if (roastLevel) params.append('roast_level', roastLevel);
  
  const response = await fetch(`${API_BASE}/brew/records?${params}`);
  if (!response.ok) throw new Error(`查询失败: ${response.status}`);
  return response.json();
}

/** 删除记录 */
export async function deleteRecord(id) {
  const response = await fetch(`${API_BASE}/brew/records/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`删除失败: ${response.status}`);
  return response.json();
}

/** 健康检查 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
