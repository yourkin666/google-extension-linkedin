import { FastifyInstance } from 'fastify';
import { getUserURN, getSimilarProfiles } from '../services/linkedin';

export default async function linkedinRoutes(fastify: FastifyInstance) {
  // 根据 username 获取 URN
  fastify.get<{
    Querystring: { username: string };
  }>('/urn', async (request, reply) => {
    const { username } = request.query;
    const reqId = request.id;

    request.log.info({ reqId, username }, '📥 收到获取 URN 请求');

    if (!username) {
      request.log.warn({ reqId }, '❌ 缺少 username 参数');
      return reply.code(400).send({
        success: false,
        message: '缺少 username 参数',
      });
    }

    try {
      const startTime = Date.now();
      const data = await getUserURN(username, request.log);
      const duration = Date.now() - startTime;
      
      request.log.info({ reqId, username, duration, urn: data.urn }, '✅ 成功获取 URN');
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      request.log.error({ reqId, username, error: error.message }, '❌ 获取 URN 失败');
      return reply.code(500).send({
        success: false,
        message: error.message || '获取 URN 失败',
      });
    }
  });

  // 获取相似用户
  fastify.get<{
    Querystring: { urn: string };
  }>('/similar', async (request, reply) => {
    const { urn } = request.query;
    const reqId = request.id;

    request.log.info({ reqId, urn }, '📥 收到获取相似用户请求');

    if (!urn) {
      request.log.warn({ reqId }, '❌ 缺少 urn 参数');
      return reply.code(400).send({
        success: false,
        message: '缺少 urn 参数',
      });
    }

    try {
      const startTime = Date.now();
      const data = await getSimilarProfiles(urn, request.log);
      const duration = Date.now() - startTime;
      
      request.log.info(
        { reqId, urn, duration, profileCount: data?.length || 0 }, 
        '✅ 成功获取相似用户'
      );
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      request.log.error({ reqId, urn, error: error.message }, '❌ 获取相似用户失败');
      return reply.code(500).send({
        success: false,
        message: error.message || '获取相似用户失败',
      });
    }
  });

  // 一站式接口：通过 username 直接获取相似用户
  fastify.get<{
    Querystring: { username: string };
  }>('/similar-by-username', async (request, reply) => {
    const { username } = request.query;
    const reqId = request.id;

    request.log.info({ reqId, username }, '📥 收到一站式获取相似用户请求');

    if (!username) {
      request.log.warn({ reqId }, '❌ 缺少 username 参数');
      return reply.code(400).send({
        success: false,
        message: '缺少 username 参数',
      });
    }

    try {
      const startTime = Date.now();
      
      // 1. 获取 URN
      request.log.debug({ reqId, username }, '🔄 步骤 1/2: 获取 URN');
      const urnData = await getUserURN(username, request.log);
      const urn = urnData.urn;
      request.log.debug({ reqId, username, urn }, '✓ 步骤 1/2 完成');

      // 2. 获取相似用户
      request.log.debug({ reqId, urn }, '🔄 步骤 2/2: 获取相似用户');
      const similarData = await getSimilarProfiles(urn, request.log);
      request.log.debug({ reqId, profileCount: similarData?.length || 0 }, '✓ 步骤 2/2 完成');

      const duration = Date.now() - startTime;
      request.log.info(
        { 
          reqId, 
          username, 
          urn, 
          profileCount: similarData?.length || 0, 
          duration 
        }, 
        '✅ 一站式获取相似用户成功'
      );

      return {
        success: true,
        data: {
          currentUser: {
            username,
            urn,
          },
          similarProfiles: similarData,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - Date.now();
      request.log.error(
        { reqId, username, error: error.message, duration }, 
        '❌ 一站式获取相似用户失败'
      );
      return reply.code(500).send({
        success: false,
        message: error.message || '获取相似用户失败',
      });
    }
  });
}

