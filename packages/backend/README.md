# CoLink API 代理服务

基于 Fastify + TypeScript 的后端服务，用于代理 LinkedIn API 请求。

## 功能

- 🔐 隐藏 RapidAPI Key（避免前端暴露）
- 🚀 高性能 Fastify 框架
- 📝 完整的 TypeScript 类型支持
- 🔄 CORS 支持

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
PORT=3000
RAPIDAPI_KEY=你的_RapidAPI_Key
RAPIDAPI_HOST=linkdapi-best-unofficial-linkedin-api.p.rapidapi.com
```

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

### 生产环境

1. 使用环境变量管理敏感信息
2. 启用 HTTPS
3. 限制 CORS 来源（修改 `src/index.ts`）
4. 添加速率限制
5. 使用 PM2 或 Docker 部署

### 示例：使用 PM2

```bash
pnpm build
pm2 start dist/index.js --name linkedin-api
```

### 示例：Docker 部署

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["node", "dist/index.js"]
```

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

