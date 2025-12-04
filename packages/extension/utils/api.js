// API 调用工具
// 非模块化版本 - 全局函数

// 开发环境
const API_BASE_URL = 'http://localhost:3000/api/linkedin';
// 生产环境
// const API_BASE_URL = 'https://your-api-domain.com/api/linkedin';

/**
 * 通过 username 获取相似用户
 */
async function getSimilarUsers(username) {
  try {
    const response = await fetch(`${API_BASE_URL}/similar-by-username?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
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
    const response = await fetch(`${API_BASE_URL}/email?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
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

