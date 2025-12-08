import { FastifyBaseLogger } from 'fastify';
import { createLogger } from '../utils/logger';
import { config } from '../config/env';
import type { LinkedInService } from './types';

// API 响应类型
interface APIResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * 通用请求函数
 */
async function fetchLinkedInAPI(url: string, logger: FastifyBaseLogger): Promise<APIResponse> {
  const log = createLogger(logger, 'LinkedInAPI');
  const startTime = Date.now();

  log.apiCallStart(url, {
    host: config.rapidApi.host,
    apiKeyPrefix: config.rapidApi.key.substring(0, 10) + '...',
  });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': config.rapidApi.host,
        'x-rapidapi-key': config.rapidApi.key,
      },
    });

    const duration = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
      log.apiCallError(url, duration, new Error(`HTTP ${response.status}: ${response.statusText}`), {
        statusCode: response.status,
        statusText: response.statusText,
        responseBody: errorText.substring(0, 500), // 只记录前500字符
      });
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
  }

    const data = await response.json() as APIResponse;
    log.apiCallSuccess(url, duration, {
      statusCode: response.status,
    });

  return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof Error && !error.message.includes('API 请求失败')) {
      // 网络错误或其他非 HTTP 错误
      log.apiCallError(url, duration, error);
    }
    throw error;
  }
}

/**
 * 根据 username 获取 URN
 */
export async function getUserURN(username: string, logger: FastifyBaseLogger) {
  const url = `${config.rapidApi.baseUrl}/username-to-urn?username=${encodeURIComponent(username)}`;
  const result = await fetchLinkedInAPI(url, logger);

  if (!result.success) {
    const error = new Error(result.message || '获取 URN 失败');
    createLogger(logger, 'getUserURN').error('API 返回失败状态', error, {
      username,
      resultMessage: result.message,
    });
    throw error;
  }

  return result.data;
}

/**
 * 根据 URN 获取相似用户
 */
export async function getSimilarProfiles(urn: string, logger: FastifyBaseLogger) {
  const url = `${config.rapidApi.baseUrl}/similar?urn=${encodeURIComponent(urn)}`;
  const result = await fetchLinkedInAPI(url, logger);

  if (!result.success) {
    const error = new Error(result.message || '获取相似用户失败');
    createLogger(logger, 'getSimilarProfiles').error('API 返回失败状态', error, {
      urn,
      resultMessage: result.message,
    });
    throw error;
  }

  return result.data;
}

/**
 * Service 工厂：提供面向接口的调用，便于注入与替换实现
 */
export function createLinkedInService(): LinkedInService {
  return {
    getUserURN,
    getSimilarProfiles,
  };
}
