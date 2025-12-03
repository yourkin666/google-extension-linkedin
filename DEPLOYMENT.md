# CoLink 部署指南

## 后端部署

### 方案 1：Vercel（推荐，免费）

#### 准备工作

1. 安装 Vercel CLI

```bash
npm i -g vercel
```

2. 在 `packages/backend` 添加 `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

#### 部署步骤

```bash
cd packages/backend
pnpm build
vercel
```

按提示配置：
- Project Name: `linkedin-recruiter-api`
- Environment Variables:
  - `RAPIDAPI_KEY`: 你的 API Key
  - `RAPIDAPI_HOST`: linkdapi-best-unofficial-linkedin-api.p.rapidapi.com

部署完成后会得到一个 URL，如：`https://linkedin-recruiter-api.vercel.app`

---

### 方案 2：Railway（推荐，免费）

1. 访问 https://railway.app/
2. 连接 GitHub 仓库
3. 选择 `packages/backend` 目录
4. 添加环境变量（同上）
5. 自动部署

---

### 方案 3：Docker 部署（自有服务器）

#### Dockerfile

在 `packages/backend` 创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### 构建和运行

```bash
docker build -t linkedin-api .
docker run -p 3000:3000 \
  -e RAPIDAPI_KEY=你的Key \
  -e RAPIDAPI_HOST=linkdapi-best-unofficial-linkedin-api.p.rapidapi.com \
  linkedin-api
```

---

## 更新插件 API 地址

部署后端后，需要更新插件中的 API 地址：

编辑 `packages/extension/utils/api.js`：

```javascript
const API_BASE_URL = 'https://你的域名.com/api/linkedin';
```

重新加载插件即可。

---

## Chrome 插件发布

### 准备工作

1. **注册开发者账号**
   - 访问 https://chrome.google.com/webstore/devconsole
   - 支付一次性费用 $5

2. **准备宣传资料**
   - 插件描述（中英文）
   - 截图（至少 1 张，1280x800 或 640x400）
   - 宣传图（可选，440x280）
   - 小图标（128x128）

3. **准备隐私政策**（必需）
   - 说明插件收集哪些数据
   - 数据如何使用
   - 可以用 GitHub Pages 托管

---

### 打包插件

#### 方法 1：直接打包

1. 访问 `chrome://extensions/`
2. 点击"打包扩展程序"
3. 选择 `packages/extension` 目录
4. 生成 `.crx` 文件

#### 方法 2：手动压缩

```bash
cd packages/extension
zip -r linkedin-recruiter.zip . -x "*.git*" "node_modules/*" "*.DS_Store"
```

---

### 发布步骤

1. 登录 [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole)

2. 点击"新增项"

3. 上传 ZIP 文件

4. 填写信息：

**基本信息**
- 名称：LinkedIn 招聘助手
- 简短描述：快速找到相似的 LinkedIn 候选人
- 详细描述：（参考下面的模板）
- 类别：生产力工具
- 语言：中文（简体）

**图片资源**
- 至少 1 张截图（展示主界面）
- 小图标（128x128）
- 宣传图（可选）

**隐私权限**
- 声明使用的权限及原因
- 提供隐私政策链接

**分发**
- 选择发布范围（公开/未公开）
- 选择地区

5. 提交审核

审核通常需要 **1-3 天**。

---

### 详细描述模板

```markdown
# LinkedIn 招聘助手

快速找到与目标候选人相似的 LinkedIn 用户，提升招聘效率！

## 核心功能

✅ 智能推荐相似候选人
✅ 快速筛选：喜欢/跳过
✅ 本地收藏列表管理
✅ 一键访问候选人主页
✅ 支持递归查找相似用户

## 使用方法

1. 访问任意 LinkedIn 个人主页
2. 点击插件图标打开侧边栏
3. 查看系统推荐的相似用户
4. 点击"收藏"保存感兴趣的候选人
5. 点击"跳过"查看下一个推荐

## 数据隐私

- 所有数据存储在本地浏览器
- 不会上传任何个人信息到第三方服务器
- 使用 LinkedIn 公开 API 获取推荐

## 支持与反馈

如有问题或建议，请联系：your-email@example.com
```

---

## 更新插件

### 修改版本号

编辑 `packages/extension/manifest.json`：

```json
{
  "version": "1.0.1"
}
```

版本号规则：
- 大版本.小版本.补丁版本
- 如：1.0.0 → 1.0.1（bug 修复）
- 如：1.0.1 → 1.1.0（新功能）

### 提交更新

1. 重新打包插件
2. 登录开发者控制台
3. 选择已发布的插件
4. 点击"上传新版本"
5. 提交审核

审核时间通常比首次发布快（几小时到 1 天）。

---

## 生产环境优化

### 后端优化

1. **启用 HTTPS**
2. **添加速率限制**

```typescript
import rateLimit from '@fastify/rate-limit';

fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes'
});
```

3. **添加缓存**

```typescript
import cache from '@fastify/caching';

fastify.register(cache, {
  privacy: 'private',
  expiresIn: 300 // 5 分钟
});
```

4. **监控和日志**
   - 使用 Sentry 监控错误
   - 使用 Winston 记录日志

---

### 前端优化

1. **压缩资源**

```bash
# 压缩 CSS
npx cssnano sidepanel/sidepanel.css -o sidepanel/sidepanel.min.css

# 压缩 JS
npx terser sidepanel/sidepanel.js -o sidepanel/sidepanel.min.js
```

2. **添加错误追踪**

集成 Sentry：

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "你的 Sentry DSN",
});
```

3. **性能监控**

使用 Chrome Extension Performance API。

---

## 维护清单

### 定期检查

- [ ] RapidAPI 配额是否充足
- [ ] LinkedIn API 是否有变化
- [ ] 用户反馈和 bug 报告
- [ ] Chrome 版本兼容性
- [ ] 安全漏洞扫描

### 备份

- [ ] 定期备份用户反馈
- [ ] 备份配置文件
- [ ] 备份代码到 Git

---

## 商业化建议（可选）

如果插件受欢迎，可以考虑：

1. **免费增值模式**
   - 基础功能免费
   - 高级功能（批量导出、高级筛选）收费

2. **订阅制**
   - 月费 $9.99
   - 年费 $99

3. **企业版**
   - 团队协作功能
   - API 集成
   - 定制化服务

4. **收费方式**
   - Stripe 支付
   - PayPal
   - 支付宝/微信支付（中国市场）

---

祝部署顺利！🚀

