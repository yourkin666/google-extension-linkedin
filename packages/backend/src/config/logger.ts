import pino from 'pino';
import { config } from './env';

/**
 * 构建日志传输配置
 */
function buildTransport() {
  // 如果不输出到文件，只使用控制台
  if (!config.log.toFile) {
    // 如果控制台也不输出，返回 undefined（静默模式）
    if (!config.log.toConsole) {
      return undefined;
    }
    
    return config.log.pretty
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: config.log.timeFormat,
            ignore: 'pid,hostname',
            colorize: config.log.colorize,
            singleLine: false,
          },
        }
      : undefined;
  }

  // 输出到文件时，使用多目标配置
  const targets: any[] = [];

  // 控制台输出（如果启用）
  if (config.log.toConsole) {
    if (config.log.pretty) {
      targets.push({
        target: 'pino-pretty',
        level: config.log.level,
        options: {
          translateTime: config.log.timeFormat,
          ignore: 'pid,hostname',
          colorize: config.log.colorize,
          singleLine: false,
        },
      });
    } else {
      // 生产环境控制台输出 JSON
      targets.push({
        target: 'pino/file',
        level: config.log.level,
        options: {
          destination: 1, // stdout
        },
      });
    }
  }

  // 所有日志写入文件（JSON 格式）
  targets.push({
    target: 'pino/file',
    level: config.log.level,
    options: {
      destination: config.log.filePath,
      mkdir: true,
    },
  });

  // 错误日志单独写入文件
  targets.push({
    target: 'pino/file',
    level: 'error',
    options: {
      destination: config.log.errorFilePath,
      mkdir: true,
    },
  });

  return {
    targets,
  };
}

/**
 * Pino 日志配置
 */
export const loggerConfig = {
  level: config.log.level,
  
  // 根据配置决定传输方式
  transport: buildTransport(),
  
  // 非美化输出时使用结构化 JSON 格式
  formatters: config.log.pretty
    ? undefined
    : {
        level: (label: string) => {
          return { level: label.toUpperCase() };
        },
      },
  
  // 序列化器，避免敏感信息泄露
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        // 不记录敏感的 headers
      },
      remoteAddress: req.ip,
      remotePort: req.socket?.remotePort,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },
};

/**
 * Fastify 日志配置
 */
export const fastifyLoggerConfig = {
  ...loggerConfig,
  
  // 自定义请求日志格式
  customLogLevel: function (req: any, res: any, err: any) {
    if (res.statusCode >= 500) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    if (res.statusCode >= 300) {
      return 'info';
    }
    return 'info';
  },
  
  // 自定义请求日志消息
  customSuccessMessage: function (req: any, res: any) {
    return `${req.method} ${req.url} - ${res.statusCode} - ${res.responseTime?.toFixed(2)}ms`;
  },
  
  customErrorMessage: function (req: any, res: any, err: any) {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
};

/**
 * 创建独立的 logger 实例（用于非 Fastify 场景）
 */
export const logger = pino(loggerConfig);

