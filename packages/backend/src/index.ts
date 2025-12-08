import Fastify from 'fastify';
import cors from '@fastify/cors';
import linkedinRoutes from './routes/linkedin';
import { createLinkedInService } from './services/linkedin';
import { fastifyLoggerConfig } from './config/logger';
import { config, validateConfig, printConfig } from './config/env';

// 验证配置
if (!validateConfig()) {
  process.exit(1);
}

const fastify = Fastify({
  logger: fastifyLoggerConfig,
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
  requestIdHeader: 'x-request-id',
});

// 注册 CORS
const corsOrigin = config.cors.origin === '*' 
  ? true 
  : config.cors.origin.split(',').map(o => o.trim());

fastify.register(cors, {
  origin: corsOrigin,
  credentials: config.cors.credentials,
});

// 注册路由（依赖注入 Service）
const linkedInService = createLinkedInService();
fastify.register(linkedinRoutes, { prefix: config.api.prefix, service: linkedInService });

// 健康检查
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 启动服务器
const start = async () => {
  try {
    // 打印配置信息
    printConfig();
    
    await fastify.listen({ 
      port: config.server.port, 
      host: config.server.host 
    });
    
    fastify.log.info(`🚀 服务器运行在 http://localhost:${config.server.port}`);
    fastify.log.info(`🌍 环境: ${config.server.env}`);
    fastify.log.info(`📝 日志级别: ${config.log.level}`);
    
    if (config.cors.origin === '*') {
      fastify.log.warn('⚠️  CORS 配置为允许所有来源，生产环境请限制 CORS_ORIGIN');
    }
  } catch (err) {
    fastify.log.error({ err }, '❌ 服务器启动失败');
    process.exit(1);
  }
};

start();
