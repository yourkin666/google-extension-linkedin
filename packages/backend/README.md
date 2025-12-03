# CoLink API 代理服务

基于 Fastify + TypeScript 的后端服务，用于代理 LinkedIn API 请求。

## 功能

- 🔐 隐藏 RapidAPI Key（避免前端暴露）
- 🚀 高性能 Fastify 框架
- 📝 完整的 TypeScript 类型支持
- 🔄 可配置的 CORS 支持
- 📊 完善的日志系统（基于 Pino）
- 🔍 请求追踪和性能监控
- ⚙️ 灵活的环境变量配置
- ✅ 自动配置验证

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件，配置必需的环境变量：

```bash
# 复制配置模板
cp ENV_CONFIG.md .env
```

最小配置（仅需配置 RAPIDAPI_KEY）：

```env
# 必填项
RAPIDAPI_KEY=你的_RapidAPI_Key
```

完整配置示例：

```env
# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# CORS 配置
CORS_ORIGIN=*
CORS_CREDENTIALS=false

# RapidAPI 配置（必填）
RAPIDAPI_KEY=你的_RapidAPI_Key
RAPIDAPI_HOST=linkdapi-best-unofficial-linkedin-api.p.rapidapi.com

# API 配置
API_PREFIX=/api/linkedin

# 日志配置
LOG_LEVEL=info
LOG_PRETTY=true
LOG_TIME_FORMAT=HH:MM:ss Z
LOG_COLORIZE=true
```

**详细配置说明请查看 [ENV_CONFIG.md](./ENV_CONFIG.md)**

### 3. 启动开发服务器

```bash
pnpm dev
```

服务器将运行在 `http://localhost:3000`

### 4. 生产构建

```bash
pnpm build
pnpm start
```

## API 接口

### 1. 健康检查

```
GET /health
```

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

### 2. 获取用户 URN

```
GET /api/linkedin/urn?username=yike-li-coco
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "urn": "ACoAAEN2pjYBKIeEHtS7sDjrEGwnsmUnJhOE0l0",
    "username": "yike-li-coco"
  }
}
```

### 3. 获取相似用户

```
GET /api/linkedin/similar?urn=ACoAAEN2pjYBKIeEHtS7sDjrEGwnsmUnJhOE0l0
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "962733987",
      "urn": "ACoAADliJ6MBwuH5exVTyTEuprfEhaAr-wivCN8",
      "publicIdentifier": "edgar-ellis-88350122a",
      "firstName": "Edgar",
      "lastName": "Ellis",
      "headline": "Senior Software Developer",
      "profilePictureURL": "https://..."
    }
  ]
}
```

### 4. 一站式接口（推荐使用）

```
GET /api/linkedin/similar-by-username?username=yike-li-coco
```

**功能：** 通过 username 直接获取相似用户（内部自动调用两个 API）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "currentUser": {
      "username": "yike-li-coco",
      "urn": "ACoAAEN2pjYBKIeEHtS7sDjrEGwnsmUnJhOE0l0"
    },
    "similarProfiles": [...]
  }
}
```

## 项目结构

```
backend/
├── src/
│   ├── index.ts              # 主入口
│   ├── routes/
│   │   └── linkedin.ts       # LinkedIn API 路由
│   └── services/
│       └── linkedin.ts       # API 调用逻辑
├── package.json
├── tsconfig.json
└── .env
```

## 错误处理

所有 API 错误都会返回统一格式：

```json
{
  "success": false,
  "message": "错误描述"
}
```

常见错误：
- `400` - 缺少必需参数
- `500` - API 调用失败（网络错误、配额用完等）

## 开发提示

### 查看日志

Fastify 自带日志系统，启动后会显示详细的请求日志。

### 测试 API

使用 curl 或 Postman 测试：

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试获取相似用户
curl "http://localhost:3000/api/linkedin/similar-by-username?username=yike-li-coco"
```

## 部署建议

### 生产环境配置

创建生产环境 `.env` 文件：

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ⚠️ 重要：限制 CORS 来源，不要使用 *
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=false

# RapidAPI 配置
RAPIDAPI_KEY=你的生产环境_API_Key

# 日志配置
LOG_LEVEL=info
LOG_PRETTY=false
```

### 生产环境建议

1. ✅ 使用环境变量管理敏感信息（已支持）
2. ✅ 限制 CORS 来源（通过 `CORS_ORIGIN` 配置）
3. ✅ 使用 info 级别日志（避免日志过多）
4. 🔧 启用 HTTPS（建议使用反向代理如 Nginx）
5. 🔧 添加速率限制（可使用 `@fastify/rate-limit`）
6. 🔧 使用 PM2 或 Docker 部署

### 示例：使用 PM2

```bash
pnpm build
pm2 start dist/index.js --name linkedin-api
```

### 示例：Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/index.js"]
```

创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

运行：

```bash
docker-compose up -d
```

## 日志系统

本项目集成了完善的日志系统，基于 **Pino** 提供高性能、结构化的日志记录。

### 主要特性

- ✅ 统一的日志格式（所有模块使用同一套日志系统）
- ✅ 请求追踪 ID（每个请求自动生成唯一 ID）
- ✅ 性能监控（自动记录请求响应时间和 API 调用时长）
- ✅ 环境区分（开发环境美化输出，生产环境 JSON 格式）
- ✅ 结构化日志（便于日志分析和检索）
- ✅ 敏感信息保护（自动过滤敏感参数）

### 日志级别配置

通过环境变量 `LOG_LEVEL` 控制：

```bash
# 开发环境 - 显示详细信息
LOG_LEVEL=debug pnpm dev

# 生产环境 - 只显示重要信息
LOG_LEVEL=info pnpm start

# 故障排查 - 显示所有信息
LOG_LEVEL=trace pnpm dev
```

可选级别：`trace` | `debug` | `info` | `warn` | `error` | `fatal`

### 日志示例

**开发环境**（美化输出）：
```
[HH:MM:ss] INFO (LinkedInAPI): 🔄 API 调用开始: https://api.linkedin.com/...
  reqId: "req-abc123"
  username: "johndoe"
[HH:MM:ss] INFO (LinkedInAPI): ✅ API 调用成功: https://api.linkedin.com/... (234ms)
  duration: 234
```

**生产环境**（JSON 格式）：
```json
{
  "level": "info",
  "time": 1234567890,
  "reqId": "req-abc123",
  "context": "LinkedInAPI",
  "url": "https://api.linkedin.com/...",
  "duration": 234,
  "msg": "✅ API 调用成功"
}
```

### 日志文件输出

支持将日志输出到文件（默认关闭）：

```env
# 启用文件日志
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/app.log
LOG_ERROR_FILE_PATH=./logs/error.log
```

启用后会生成：
- `logs/app.log` - 所有日志（JSON 格式）
- `logs/error.log` - 仅错误日志（JSON 格式）

详细的日志文件配置请查看 [LOG_FILE_CONFIG.md](./LOG_FILE_CONFIG.md)

## 环境变量配置

所有配置项都通过 `.env` 文件管理，支持以下配置：

- 🌐 **服务器配置**：端口、主机地址、运行环境
- 🔒 **CORS 配置**：允许的来源、凭证设置
- 🔑 **RapidAPI 配置**：API Key 和主机地址
- 📊 **日志配置**：日志级别、输出格式、时间格式
- 🔧 **API 配置**：路由前缀

**完整配置说明请查看 [ENV_CONFIG.md](./ENV_CONFIG.md)**

## RapidAPI 配置

本项目使用 RapidAPI 的 LinkedIn API：
https://rapidapi.com/linkdataapi-linkdataapi-default/api/linkdapi-best-unofficial-linkedin-api

### 获取 API Key

1. 注册 RapidAPI 账号
2. 订阅 LinkedIn API（有免费额度）
3. 复制 API Key 到 `.env` 文件

### 免费额度

通常提供 100-500 次/月的免费调用，足够开发测试使用。

## 许可证

MIT

