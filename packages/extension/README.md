# CoLink - Chrome 插件

## 功能特性

✅ 智能推荐相似 LinkedIn 用户  
✅ 快速筛选：喜欢/跳过  
✅ 本地收藏列表管理  
✅ 一键跳转到候选人主页  
✅ 支持基于推荐用户继续查找

## 项目结构

```
extension/
├── manifest.json           # 插件配置文件
├── icons/                  # 图标资源
├── background/             # 后台服务
│   └── background.js
├── content/                # 内容脚本（运行在 LinkedIn 页面）
│   └── content.js
├── sidepanel/              # 侧边栏主界面
│   ├── sidepanel.html
│   ├── sidepanel.css
│   └── sidepanel.js
└── utils/                  # 工具函数
    ├── api.js              # API 调用
    └── storage.js          # 本地存储
```

## 安装方法

### 1. 配置环境变量

首次使用需要配置 `.env` 文件：

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件，填入实际配置
# 然后构建配置文件
npm run build:config
```

详细配置说明请查看 [CONFIG.md](./CONFIG.md)

### 2. 准备图标

在 `icons/` 目录下放置三个尺寸的图标：
- icon16.png
- icon48.png  
- icon128.png

临时方案：可以从网上下载任意 PNG 图标，调整尺寸后使用。

### 3. 加载插件到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的**开发者模式**
4. 点击**加载已解压的扩展程序**
5. 选择 `packages/extension` 文件夹

### 4. 确保后端服务运行

```bash
cd packages/backend
pnpm install
pnpm dev
```

后端应运行在 `http://localhost:3000`

## 使用说明

### 步骤 1：访问 LinkedIn 个人主页

打开任意 LinkedIn 用户主页，例如：
```
https://www.linkedin.com/in/yike-li-coco/
```

### 步骤 2：打开侧边栏

点击浏览器工具栏中的插件图标，侧边栏会自动打开。

### 步骤 3：查看推荐

插件会自动加载与当前用户相似的候选人列表。

### 步骤 4：筛选候选人

- **👋 NO** - 跳过当前候选人
- **✅ 收藏** - 保存到收藏列表
- **🔍 根据 Ta 找相似** - 基于当前推荐用户继续查找

点击"跳过"或"收藏"后，插件会自动跳转到下一个推荐用户的主页。

### 步骤 5：管理收藏

切换到**已收藏** Tab，查看所有保存的候选人：
- 点击**访问**按钮跳转到候选人主页
- 点击**移除**按钮从收藏列表删除

## 配置

### 环境配置

所有配置项都通过 `.env` 文件管理，包括：
- Supabase 配置（URL 和密钥）
- API 地址（开发/生产环境）
- 运行环境标识

**修改配置步骤：**

1. 编辑 `.env` 文件
2. 运行 `npm run build:config` 重新生成配置
3. 在 Chrome 中重新加载扩展

详细说明请查看 [CONFIG.md](./CONFIG.md)

### 环境切换

**开发环境：**
```bash
# .env 中设置
API_BASE_URL=http://localhost:3000/api/linkedin
NODE_ENV=development

# 重新构建配置
npm run build:config
```

**生产环境：**
```bash
# .env 中设置
API_BASE_URL=https://colink.in/api/linkedin
NODE_ENV=production

# 重新构建配置
npm run build:config
```

## 常见问题

### Q: 侧边栏显示"加载失败，请检查后端服务"

**A:** 确保后端服务已启动：
```bash
cd packages/backend
pnpm dev
```

### Q: 显示"这里不是用户主页，没法找相似哦～"

**A:** 当前页面不是 LinkedIn 个人主页。请访问格式为 `linkedin.com/in/username/` 的页面。

### Q: 图标不显示

**A:** 在 `icons/` 目录下添加三个尺寸的 PNG 图标文件，或者暂时注释掉 manifest.json 中的 icons 配置。

### Q: 推荐用户列表为空

**A:** 可能是：
1. API 配额已用完
2. 当前用户没有相似推荐
3. API Key 配置错误（检查 backend/.env）

## 技术栈

- **Manifest V3** - Chrome 插件标准
- **Vanilla JavaScript** - 无框架，轻量快速
- **Chrome Storage API** - 本地数据存储
- **Chrome Side Panel API** - 侧边栏展示

## 开发提示

### 调试

- **查看 Content Script 日志**：打开 LinkedIn 页面 → F12 → Console
- **查看 Sidepanel 日志**：右键侧边栏 → 检查
- **查看 Background 日志**：chrome://extensions/ → 点击"service worker"

### 热更新

修改代码后：
1. 访问 `chrome://extensions/`
2. 点击插件的**刷新**按钮
3. 重新打开侧边栏

