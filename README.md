# CoLink

一个帮助招聘人员在 LinkedIn 上快速找到相似候选人的 Chrome 插件。

## 项目结构

```
recruitment-market/
├── packages/
│   ├── backend/      # Fastify 后端服务
│   └── extension/    # Chrome 插件
└── package.json
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

**同时启动前后端：**
```bash
pnpm dev
```

**或分别启动：**
```bash
# 启动后端 (端口 3000)
pnpm dev:backend

# 开发插件
pnpm dev:extension
```

### 构建

```bash
# 构建后端
pnpm build:backend

# 构建插件
pnpm build:extension
```

## 后端配置

在 `packages/backend` 目录创建 `.env` 文件：

```env
PORT=3000
RAPIDAPI_KEY=你的_RapidAPI_Key
RAPIDAPI_HOST=linkdapi-best-unofficial-linkedin-api.p.rapidapi.com
```

## Chrome 插件安装

1. 构建插件：`pnpm build:extension`
2. 打开 Chrome 浏览器
3. 访问 `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择 `packages/extension/dist` 目录

## 使用说明

1. 访问任意 LinkedIn 个人主页（如 `linkedin.com/in/username/`）
2. 点击插件图标或打开侧边栏
3. 查看相似用户推荐
4. 点击"喜欢"保存用户，或"跳过"
5. 自动跳转到下一个推荐用户

## 技术栈

- **后端**: TypeScript + Node.js + Fastify
- **前端**: Vanilla JS + Chrome Extension API
- **存储**: Chrome Storage API
- **API**: RapidAPI LinkedIn API

