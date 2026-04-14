/**
 * BrewLog API 服务层
 * 
 * 这个文件封装了所有和后端通信的逻辑。
 * 前端的其他组件不需要知道 API 的 URL 是什么、请求格式是什么，
 * 它们只需要调用这里的函数就行。
 * 
 * 这就是"关注点分离"——UI 组件只管展示，API 逻辑集中在这里。
 */

const API_BASE = '/api/v1';

/**
 * 调用后端的解析接口
 * 把用户输入的自然语言发给后端，后端调用 DeepSeek 返回结构化数据
 * 
 * @param {string} rawInput - 用户输入的原始文本
 * @param {string} inputType - "text" 或 "voice"
 * @returns {object} 解析结果，包含 parsed、missing_fields、notifications
 */
export async function parseBrew(rawInput, inputType = 'text') {
  const response = await fetch(`${API_BASE}/brew/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw_input: rawInput,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    throw new Error(`解析请求失败: ${response.status}`);
  }

  return response.json();
}

/**
 * 健康检查 - 确认后端是否在运行
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
