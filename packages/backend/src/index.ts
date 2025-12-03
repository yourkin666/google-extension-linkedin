import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import linkedinRoutes from './routes/linkedin';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// 注册 CORS
fastify.register(cors, {
  origin: true, // 允许所有来源（生产环境需要限制）
});

// 注册路由
fastify.register(linkedinRoutes, { prefix: '/api/linkedin' });

// 健康检查
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 启动服务器
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 服务器运行在 http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

