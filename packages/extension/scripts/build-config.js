#!/usr/bin/env node
/**
 * 配置文件构建脚本
 * 从 .env 文件读取环境变量并生成 config.generated.js
 */

const fs = require('fs');
const path = require('path');

// 读取 .env 文件
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ 错误: .env 文件不存在');
    console.log('📝 请复制 .env.example 为 .env 并填入配置');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    // 跳过空行和注释
    if (!line.trim() || line.trim().startsWith('#')) {
      return;
    }

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

// 生成配置文件
function generateConfig(env) {
  const config = `// ⚠️ 此文件由 scripts/build-config.js 自动生成
// 请勿手动编辑！修改 .env 文件后运行 npm run build:config

/**
 * 扩展配置
 * 从 .env 文件生成
 */
const CONFIG = {
  // Supabase 配置
  supabase: {
    url: '${env.SUPABASE_URL || ''}',
    anonKey: '${env.SUPABASE_ANON_KEY || ''}',
  },
  
  // API 配置
  api: {
    baseUrl: '${env.API_BASE_URL || 'http://localhost:3000/api/linkedin'}',
  },

  // 环境
  env: '${env.NODE_ENV || 'development'}',
};

// 导出配置（兼容不同的加载方式）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
`;

  return config;
}

// 主函数
function main() {
  try {
    console.log('🔧 开始构建配置文件...');
    
    // 加载环境变量
    const env = loadEnv();
    console.log('✅ 已读取 .env 文件');

    // 生成配置
    const config = generateConfig(env);
    
    // 写入文件
    const outputPath = path.join(__dirname, '../utils/config.generated.js');
    fs.writeFileSync(outputPath, config, 'utf-8');
    console.log('✅ 已生成 utils/config.generated.js');

    console.log('🎉 配置文件构建完成！');
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

main();

