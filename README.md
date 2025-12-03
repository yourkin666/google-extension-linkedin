# CoLink 🔗

在 LinkedIn 上快速找到相似候选人的 Chrome 插件。

## ✨ 核心功能

- 🎯 **智能推荐**：基于任意 LinkedIn 用户找相似人才
- 🔄 **自动累加**：收藏用户后自动扩展更多相似候选人
- 🚫 **智能去重**：自动过滤已推荐用户
- 💾 **收藏管理**：保存感兴趣的候选人

## 🚀 快速开始

### 1. 后端配置

在 `packages/backend` 创建 `.env`：

```env
PORT=3000
RAPIDAPI_KEY=你的密钥
RAPIDAPI_HOST=linkdapi-best-unofficial-linkedin-api.p.rapidapi.com
```

### 2. 启动后端

```bash
cd packages/backend
npm install
npm run dev
```

### 3. 安装插件

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `packages/extension` 目录

## 📖 使用方法

1. **打开 LinkedIn 用户主页**
2. **点击"🔍 找相似"** → 开始推荐
3. **筛选候选人**：
   - 👋 **NO** - 跳过
   - ✅ **收藏** - 保存 + 自动找更多相似用户
   - ⏹️ **停止筛选** - 结束当前流程
4. **查看收藏** → 切换到"已收藏"标签

## 💡 工作原理

```
用户主页 → 点击"找相似" → 获取推荐列表
    ↓
点击收藏 → 保存用户 + 基于该用户再次查找 → 新用户累加（去重）
    ↓
待筛选池越来越大，推荐越来越精准
```

## 🛠 技术栈

- **后端**: Node.js + Fastify + RapidAPI
- **插件**: Chrome Extension API + Vanilla JS
- **存储**: Chrome Storage API

## 📞 联系方式

遇到问题可联系 wx: **yourkin666**
