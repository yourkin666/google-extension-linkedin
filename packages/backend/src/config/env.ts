import dotenv from 'dotenv';

// 确保环境变量已加载
dotenv.config();

/**
 * 环境变量配置
 * 所有配置项都从 .env 文件读取，提供默认值
 */
export const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },

  // CORS 配置
  cors: {
    // 允许的来源，多个用逗号分隔，'*' 表示允许所有
    origin: process.env.CORS_ORIGIN || '*',
    // 是否允许携带凭证
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // RapidAPI 配置
  rapidApi: {
    key: process.env.RAPIDAPI_KEY || '',
    host: process.env.RAPIDAPI_HOST || 'linkdapi-best-unofficial-linkedin-api.p.rapidapi.com',
    baseUrl: '', // 将在下面初始化
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    // 是否美化输出（开发环境默认 true，生产环境默认 false）
    pretty: process.env.LOG_PRETTY === 'true' || 
           (process.env.LOG_PRETTY !== 'false' && process.env.NODE_ENV !== 'production'),
    // 日志时间格式
    timeFormat: process.env.LOG_TIME_FORMAT || 'HH:MM:ss Z',
    // 是否使用彩色输出
    colorize: process.env.LOG_COLORIZE === 'true' || 
             (process.env.LOG_COLORIZE !== 'false' && process.env.NODE_ENV !== 'production'),
    // 是否输出到文件
    toFile: process.env.LOG_TO_FILE === 'true',
    // 日志文件路径
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    // 错误日志文件路径
    errorFilePath: process.env.LOG_ERROR_FILE_PATH || './logs/error.log',
    // 是否输出到控制台（默认 true）
    toConsole: process.env.LOG_TO_CONSOLE !== 'false',
  },

  // API 路由前缀
  api: {
    prefix: process.env.API_PREFIX || '/api/linkedin',
  },

  // Supabase 配置（用于鉴权）
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    // 可选：若未来改为本地 JWT 校验，可使用此密钥
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  },
};

// 初始化计算属性
config.rapidApi.baseUrl = `https://${config.rapidApi.host}/api/v1/profile`;

// 验证必需的配置项
export function validateConfig() {
  const errors: string[] = [];

  if (!config.rapidApi.key) {
    errors.push('❌ RAPIDAPI_KEY 未设置！请在 .env 文件中配置');
  }

  if (!config.supabase.url) {
    errors.push('❌ SUPABASE_URL 未设置！所有后端接口启用鉴权需要该配置');
  }
  if (!config.supabase.anonKey) {
    errors.push('❌ SUPABASE_ANON_KEY 未设置！所有后端接口启用鉴权需要该配置');
  }

  if (errors.length > 0) {
    console.error('\n配置验证失败：');
    errors.forEach(error => console.error(error));
    console.error('\n请检查 .env 文件配置\n');
    return false;
  }

  return true;
}

// 打印配置信息（不包含敏感信息）
export function printConfig() {
  console.log('\n📋 当前配置：');
  console.log(`  环境: ${config.server.env}`);
  console.log(`  服务器: ${config.server.host}:${config.server.port}`);
  console.log(`  CORS 来源: ${config.cors.origin}`);
  console.log(`  API 前缀: ${config.api.prefix}`);
  console.log(`  日志级别: ${config.log.level}`);
  console.log(`  日志输出: ${config.log.toConsole ? '控制台' : ''}${config.log.toConsole && config.log.toFile ? ' + ' : ''}${config.log.toFile ? '文件' : ''}`);
  if (config.log.toFile) {
    console.log(`    - 常规日志: ${config.log.filePath}`);
    console.log(`    - 错误日志: ${config.log.errorFilePath}`);
  }
  console.log(`  RapidAPI Host: ${config.rapidApi.host}`);
  console.log(`  RapidAPI Key: ${config.rapidApi.key ? config.rapidApi.key.substring(0, 10) + '...' : '未设置'}\n`);
  console.log(`  Supabase URL: ${config.supabase.url || '未设置'}`);
  console.log(`  Supabase Anon Key: ${config.supabase.anonKey ? config.supabase.anonKey.substring(0, 10) + '...' : '未设置'}\n`);
}
