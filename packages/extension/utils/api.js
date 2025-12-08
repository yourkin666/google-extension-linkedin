// API 调用工具
// 非模块化版本 - 全局函数

// 从配置文件读取 API 地址
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.api) 
  ? CONFIG.api.baseUrl 
  : 'https://colink.in/api/linkedin';
/**
 * 通过 username 获取相似用户
 */
async function getSimilarUsers(username) {
  try {
    const token = (typeof getAccessToken === 'function') ? await getAccessToken() : null;
    const response = await fetch(`${API_BASE_URL}/similar-by-username?username=${encodeURIComponent(username)}` , {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('未登录或登录已过期，请先登录');
      }
      throw new Error(`API 请求失败: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取相似用户失败');
    }
    
    return result.data;
  } catch (error) {
    console.error('API 调用错误:', error);
    throw error;
  }
}

/**
 * 获取用户邮箱
 * @param {string} username - LinkedIn username
 * @returns {Promise<string>} 邮箱地址
 */
async function getUserEmail(username) {
  try {
    // TODO: 替换为真实的邮箱API
    const token = (typeof getAccessToken === 'function') ? await getAccessToken() : null;
    const response = await fetch(`${API_BASE_URL}/email?username=${encodeURIComponent(username)}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('未登录或登录已过期，请先登录');
      }
      throw new Error(`API 请求失败: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取邮箱失败');
    }
    
    return result.data.email;
  } catch (error) {
    console.error('获取邮箱失败:', error);
    // 返回模拟邮箱
    return `${username}@example.com`;
  }
}
