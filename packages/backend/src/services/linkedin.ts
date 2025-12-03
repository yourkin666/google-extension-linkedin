import dotenv from 'dotenv';

// 确保环境变量已加载
dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'linkdapi-best-unofficial-linkedin-api.p.rapidapi.com';

const BASE_URL = `https://${RAPIDAPI_HOST}/api/v1/profile`;

// 启动时验证环境变量
if (!RAPIDAPI_KEY) {
  console.error('❌ 错误：RAPIDAPI_KEY 未设置！请检查 .env 文件');
} else {
  console.log('✅ RAPIDAPI_KEY 已加载，前10位:', RAPIDAPI_KEY.substring(0, 10));
}

/**
 * 通用请求函数
 */
async function fetchLinkedInAPI(url: string) {
  console.log('调用 LinkedIn API:', url);
  console.log('API Key 前缀:', RAPIDAPI_KEY.substring(0, 10) + '...');
  console.log('API Host:', RAPIDAPI_HOST);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
  });

  console.log('响应状态:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API 错误响应:', errorText);
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * 根据 username 获取 URN
 */
export async function getUserURN(username: string) {
  const url = `${BASE_URL}/username-to-urn?username=${encodeURIComponent(username)}`;
  const result = await fetchLinkedInAPI(url);

  if (!result.success) {
    throw new Error(result.message || '获取 URN 失败');
  }

  return result.data;
}

/**
 * 根据 URN 获取相似用户
 */
export async function getSimilarProfiles(urn: string) {
  const url = `${BASE_URL}/similar?urn=${encodeURIComponent(urn)}`;
  const result = await fetchLinkedInAPI(url);

  if (!result.success) {
    throw new Error(result.message || '获取相似用户失败');
  }

  return result.data;
}

