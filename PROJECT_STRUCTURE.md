# CoLink 项目结构

```
recruitment-market/
├── README.md                      # 项目总览
├── QUICKSTART.md                  # 快速开始指南 ⭐
├── TESTING.md                     # 测试指南
├── DEPLOYMENT.md                  # 部署指南
├── PROJECT_STRUCTURE.md           # 本文件
├── package.json                   # 根配置
├── pnpm-workspace.yaml            # Monorepo 工作区配置
├── .gitignore                     # Git 忽略文件
│
├── packages/
│   ├── backend/                   # 后端服务
│   │   ├── src/
│   │   │   ├── index.ts           # 主入口
│   │   │   ├── routes/
│   │   │   │   └── linkedin.ts    # LinkedIn API 路由
│   │   │   └── services/
│   │   │       └── linkedin.ts    # API 调用服务
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env                   # 环境变量（不提交）
│   │   ├── .env.example           # 环境变量模板
│   │   └── README.md
│   │
│   └── extension/                 # Chrome 插件
│       ├── manifest.json          # 插件配置文件 ⭐
│       ├── icons/                 # 图标资源
│       │   ├── icon.svg           # SVG 源文件
│       │   ├── icon16.png         # 需自行生成
│       │   ├── icon48.png         # 需自行生成
│       │   ├── icon128.png        # 需自行生成
│       │   └── README.md
│       ├── background/            # 后台服务
│       │   └── background.js      # Service Worker
│       ├── content/               # 内容脚本
│       │   └── content.js         # 在 LinkedIn 页面运行
│       ├── sidepanel/             # 侧边栏界面
│       │   ├── sidepanel.html     # HTML 结构
│       │   ├── sidepanel.css      # 样式
│       │   └── sidepanel.js       # 交互逻辑 ⭐
│       ├── utils/                 # 工具函数
│       │   ├── api.js             # API 调用
│       │   └── storage.js         # 本地存储
│       ├── package.json
│       └── README.md
```

## 核心文件说明

### 配置文件

| 文件 | 说明 |
|------|------|
| `manifest.json` | Chrome 插件配置，定义权限、文件引用等 |
| `packages/backend/.env` | 后端环境变量，包含 API Key |
| `pnpm-workspace.yaml` | Monorepo 配置，管理多包依赖 |

### 后端核心文件

| 文件 | 说明 | 行数 |
|------|------|------|
| `src/index.ts` | Fastify 服务器入口 | ~40 |
| `src/routes/linkedin.ts` | API 路由定义 | ~90 |
| `src/services/linkedin.ts` | LinkedIn API 调用逻辑 | ~50 |

### 插件核心文件

| 文件 | 说明 | 行数 |
|------|------|------|
| `background/background.js` | 后台服务，处理插件图标点击 | ~15 |
| `content/content.js` | 提取 LinkedIn 页面信息 | ~40 |
| `sidepanel/sidepanel.html` | 侧边栏 HTML 结构 | ~80 |
| `sidepanel/sidepanel.css` | 侧边栏样式 | ~300 |
| `sidepanel/sidepanel.js` | 侧边栏核心逻辑 | ~250 |
| `utils/api.js` | API 调用工具 | ~25 |
| `utils/storage.js` | 本地存储工具 | ~70 |

## 数据流

```
LinkedIn 页面
    ↓
Content Script (提取 username)
    ↓
Chrome Storage (保存 currentUsername)
    ↓
Side Panel (读取 username)
    ↓
调用后端 API
    ↓
后端调用 RapidAPI
    ↓
返回相似用户列表
    ↓
Side Panel 显示
    ↓
用户点击"收藏/跳过"
    ↓
Chrome Storage (保存收藏)
    ↓
跳转到下一个用户页面
```

## 技术栈

### 后端
- **运行时**: Node.js 20+
- **框架**: Fastify 4
- **语言**: TypeScript 5
- **开发工具**: tsx (TypeScript 执行器)

### 前端
- **语言**: JavaScript (ES6+)
- **API**: Chrome Extension API (Manifest V3)
- **存储**: Chrome Storage API
- **样式**: 原生 CSS

### 工具
- **包管理**: pnpm
- **Monorepo**: pnpm workspaces
- **API**: RapidAPI LinkedIn API

## 依赖关系

### 后端依赖
```json
{
  "dependencies": {
    "fastify": "^4.25.2",
    "@fastify/cors": "^9.0.1",
    "dotenv": "^16.3.1"
  }
}
```

### 插件依赖
无外部依赖，纯原生 JavaScript。

## 环境变量

### 后端 (.env)
```env
PORT=3000
RAPIDAPI_KEY=你的_API_Key
RAPIDAPI_HOST=linkdapi-best-unofficial-linkedin-api.p.rapidapi.com
```

## Chrome 权限

插件需要的权限：
- `storage` - 本地存储收藏列表
- `activeTab` - 读取当前标签页 URL
- `sidePanel` - 显示侧边栏
- `https://www.linkedin.com/*` - 访问 LinkedIn 页面
- `http://localhost:3000/*` - 调用本地后端 API

## 存储结构

### Chrome Storage Local

```javascript
{
  "currentUsername": "satyanadella",  // 当前页面用户名
  "currentUrl": "https://...",        // 当前页面 URL
  "favorites": [                      // 收藏列表
    {
      "id": "...",
      "urn": "...",
      "publicIdentifier": "...",
      "firstName": "...",
      "lastName": "...",
      "headline": "...",
      "profilePictureURL": "...",
      "savedAt": "2025-12-02T..."     // 收藏时间
    }
  ],
  "skippedCount": 42                  // 跳过总数
}
```

## API 接口

### 后端 API

**Base URL**: `http://localhost:3000/api/linkedin`

| 接口 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/urn` | GET | `username` | 获取用户 URN |
| `/similar` | GET | `urn` | 获取相似用户 |
| `/similar-by-username` | GET | `username` | 一站式获取（推荐） |

### RapidAPI

| 接口 | 说明 |
|------|------|
| `/username-to-urn` | 将 username 转换为 URN |
| `/similar` | 根据 URN 获取相似用户 |

## 代码规范

### 命名规范
- 文件名：小写 + 连字符（如 `sidepanel.js`）
- 变量名：驼峰命名（如 `currentUsername`）
- 函数名：驼峰命名（如 `getSimilarUsers`）
- 常量名：大写 + 下划线（如 `API_BASE_URL`）

### 注释规范
```javascript
/**
 * 函数功能说明
 * @param {string} username - 参数说明
 * @returns {Promise<Object>} 返回值说明
 */
async function getSimilarUsers(username) {
  // 实现...
}
```

## 构建和部署

### 开发环境
```bash
pnpm install           # 安装依赖
pnpm dev              # 同时启动前后端
```

### 生产环境
```bash
pnpm build:backend    # 构建后端
pnpm build:extension  # 打包插件
```

## 扩展建议

### 可添加的功能

1. **数据导出**
   - CSV 导出收藏列表
   - JSON 数据备份

2. **高级筛选**
   - 按职位筛选
   - 按地区筛选
   - 按行业筛选

3. **批量操作**
   - 批量收藏
   - 批量导出邮箱

4. **邮件功能**
   - 自动发送招聘邮件
   - 邮件模板管理

5. **统计分析**
   - 筛选历史
   - 收藏趋势
   - 推荐准确度

6. **团队协作**
   - 多账号同步
   - 共享收藏列表
   - 任务分配

### 技术优化

1. **前端优化**
   - 引入 React/Vue 框架
   - 使用 Webpack/Vite 构建
   - 添加单元测试

2. **后端优化**
   - 添加数据库（PostgreSQL）
   - 实现缓存（Redis）
   - 添加队列（Bull）

3. **性能优化**
   - 懒加载
   - 虚拟滚动
   - Service Worker 缓存

## 许可证

MIT

## 作者

[你的名字]

## 版本历史

- v1.0.0 (2025-12-02) - 初始版本
  - 基础功能实现
  - 收藏列表
  - API 集成

