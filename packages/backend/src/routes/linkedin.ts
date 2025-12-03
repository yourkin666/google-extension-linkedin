import { FastifyInstance } from 'fastify';
import { getUserURN, getSimilarProfiles } from '../services/linkedin';

export default async function linkedinRoutes(fastify: FastifyInstance) {
  // 根据 username 获取 URN
  fastify.get<{
    Querystring: { username: string };
  }>('/urn', async (request, reply) => {
    const { username } = request.query;

    if (!username) {
      return reply.code(400).send({
        success: false,
        message: '缺少 username 参数',
      });
    }

    try {
      const data = await getUserURN(username);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      fastify.log.error(error);
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

    if (!urn) {
      return reply.code(400).send({
        success: false,
        message: '缺少 urn 参数',
      });
    }

    try {
      const data = await getSimilarProfiles(urn);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      fastify.log.error(error);
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

    if (!username) {
      return reply.code(400).send({
        success: false,
        message: '缺少 username 参数',
      });
    }

    try {
      // 1. 获取 URN
      const urnData = await getUserURN(username);
      const urn = urnData.urn;

      // 2. 获取相似用户
      const similarData = await getSimilarProfiles(urn);

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
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: error.message || '获取相似用户失败',
      });
    }
  });
}

