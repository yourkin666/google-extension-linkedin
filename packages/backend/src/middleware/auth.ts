import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/env';
import crypto from 'crypto';

// Base64URL -> Buffer
function base64UrlToBuffer(input: string): Buffer {
  const pad = 4 - (input.length % 4 || 4);
  const base64 = (input + '='.repeat(pad)).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyHS256(token: string, secret: string): { header: any; payload: any } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  try {
    const header = JSON.parse(base64UrlToBuffer(h).toString('utf8'));
    if (header.alg !== 'HS256') return null;

    const payload = JSON.parse(base64UrlToBuffer(p).toString('utf8'));

    const data = Buffer.from(`${h}.${p}`);
    const expected = crypto
      .createHmac('sha256', Buffer.from(secret, 'utf8'))
      .update(data)
      .digest();
    const actual = base64UrlToBuffer(s);

    if (!safeEqual(expected, actual)) return null;

    // 过期校验（exp 为秒）
    if (typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSec) return null;
    }

    return { header, payload };
  } catch {
    return null;
  }
}

/**
 * Supabase 鉴权中间件（本地 JWT HS256 校验）
 * - 从 Authorization 读取 Bearer token
 * - 用 SUPABASE_JWT_SECRET 验证 HS256 签名与过期时间
 * - 校验失败返回 401
 */
export default async function authPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers['authorization'] || '';
    const match = /Bearer\s+(.+)/i.exec(Array.isArray(authHeader) ? authHeader[0] : authHeader);
    const token = match ? match[1] : '';

    if (!token) {
      return reply.code(401).send({ success: false, message: '未认证：缺少令牌' });
    }

    const secret = config.supabase.jwtSecret;
    if (!secret) {
      request.log.error('未配置 SUPABASE_JWT_SECRET');
      return reply.code(500).send({ success: false, message: '服务器配置错误：缺少 JWT 密钥' });
    }

    const verified = verifyHS256(token, secret);
    if (!verified) {
      return reply.code(401).send({ success: false, message: '未认证：令牌无效或已过期' });
    }

    // 可按需挂载用户信息： (req as any).user = verified.payload
    return; // 通过
  });
}
