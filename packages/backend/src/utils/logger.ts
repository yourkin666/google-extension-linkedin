import { FastifyBaseLogger } from 'fastify';

/**
 * 日志工具类
 * 用于在 Service 层统一日志格式
 */
export class Logger {
  constructor(private logger: FastifyBaseLogger, private context: string) {}

  /**
   * Debug 级别日志
   */
  debug(message: string, data?: any) {
    this.logger.debug({ context: this.context, ...data }, message);
  }

  /**
   * Info 级别日志
   */
  info(message: string, data?: any) {
    this.logger.info({ context: this.context, ...data }, message);
  }

  /**
   * Warn 级别日志
   */
  warn(message: string, data?: any) {
    this.logger.warn({ context: this.context, ...data }, message);
  }

  /**
   * Error 级别日志
   */
  error(message: string, error?: Error | any, data?: any) {
    this.logger.error(
      {
        context: this.context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        ...data,
      },
      message
    );
  }

  /**
   * 记录 API 调用开始
   */
  apiCallStart(url: string, data?: any) {
    this.logger.info(
      {
        context: this.context,
        url,
        type: 'api_call_start',
        ...data,
      },
      `🔄 API 调用开始: ${url}`
    );
  }

  /**
   * 记录 API 调用成功
   */
  apiCallSuccess(url: string, duration: number, data?: any) {
    this.logger.info(
      {
        context: this.context,
        url,
        duration,
        type: 'api_call_success',
        ...data,
      },
      `✅ API 调用成功: ${url} (${duration}ms)`
    );
  }

  /**
   * 记录 API 调用失败
   */
  apiCallError(url: string, duration: number, error: Error | any, data?: any) {
    this.logger.error(
      {
        context: this.context,
        url,
        duration,
        type: 'api_call_error',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        ...data,
      },
      `❌ API 调用失败: ${url} (${duration}ms)`
    );
  }
}

/**
 * 创建 Logger 实例的工厂函数
 */
export function createLogger(logger: FastifyBaseLogger, context: string): Logger {
  return new Logger(logger, context);
}

