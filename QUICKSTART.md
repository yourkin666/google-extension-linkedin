# CoLink 快速开始指南 🚀

## 第一步：安装依赖

在项目根目录运行：

```bash
pnpm install
```

这会自动安装前后端的所有依赖。

## 第二步：准备插件图标

### 方案 A：使用在线工具生成（推荐）

1. 访问 https://www.favicon-generator.org/
2. 上传或设计一个图标
3. 下载 16x16、48x48、128x128 三个尺寸
4. 重命名为 `icon16.png`、`icon48.png`、`icon128.png`
5. 放到 `packages/extension/icons/` 目录

### 方案 B：临时使用 Emoji

在 Chrome 中可以临时不显示图标，直接跳到下一步。

## 第三步：配置后端 API Key

1. 访问 https://rapidapi.com/linkdataapi-linkdataapi-default/api/linkdapi-best-unofficial-linkedin-api
2. 注册并订阅（有免费额度）
3. 复制你的 API Key
4. 打开 `packages/backend/.env` 文件
5. 修改 `RAPIDAPI_KEY` 为你的 Key

```env
PORT=3000
RAPIDAPI_KEY=你的_API_Key_在这里
RAPIDAPI_HOST=linkdapi-best-unofficial-linkedin-api.p.rapidapi.com
```

## 第四步：启动后端服务

```bash
pnpm dev:backend
```

看到以下信息说明启动成功：

```
🚀 服务器运行在 http://localhost:3000
```

测试一下：

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{"status":"ok","timestamp":"..."}
```

## 第五步：加载 Chrome 插件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择 `packages/extension` 文件夹
6. 看到插件出现在列表中，说明安装成功 ✅

## 第六步：测试功能

### 1. 访问 LinkedIn 个人主页

打开任意 LinkedIn 用户主页，例如：

```
https://www.linkedin.com/in/satyanadella/
```

### 2. 打开插件侧边栏

点击浏览器工具栏中的插件图标（或右键插件 → "打开侧边栏"）

### 3. 查看推荐

侧边栏应该会显示：
- 加载动画
- 相似用户列表
- 统计信息（待筛选、已收藏）

### 4. 测试操作

- 点击 **"👋 NO"** - 跳过当前用户
- 点击 **"✅ 收藏"** - 保存到收藏列表
- 观察页面是否自动跳转到下一个推荐用户

### 5. 查看收藏列表

切换到 **"已收藏"** Tab，查看保存的候选人。

## 常见问题排查

### ❌ 侧边栏显示"加载失败"

**原因：** 后端服务未启动或 API 配置错误

**解决：**
1. 检查后端服务是否运行（终端应该有日志输出）
2. 测试 API：`curl http://localhost:3000/health`
3. 检查 `.env` 文件中的 `RAPIDAPI_KEY` 是否正确

### ❌ 显示"这里不是用户主页"

**原因：** 当前页面不是 LinkedIn 个人主页

**解决：** 访问格式为 `linkedin.com/in/username/` 的页面

### ❌ 图标不显示

**原因：** 缺少图标文件

**解决：** 
- 添加图标到 `packages/extension/icons/` 目录
- 或临时注释掉 `manifest.json` 中的 `icons` 配置

### ❌ 修改代码后不生效

**解决：**
1. 访问 `chrome://extensions/`
2. 找到插件，点击 **"刷新"** 按钮
3. 重新打开侧边栏

## 开发调试

### 查看插件日志

- **Content Script 日志**：F12 → Console（在 LinkedIn 页面）
- **Sidepanel 日志**：右键侧边栏 → "检查"
- **Background 日志**：`chrome://extensions/` → 点击 "service worker"

### 查看后端日志

后端终端会实时显示所有 API 请求日志。

### 测试 API

```bash
# 获取相似用户
curl "http://localhost:3000/api/linkedin/similar-by-username?username=satyanadella"
```

## 下一步

✅ 功能正常后，可以开始定制：

1. **美化 UI**：修改 `packages/extension/sidepanel/sidepanel.css`
2. **添加功能**：如标签分类、批量导出等
3. **部署后端**：使用 Vercel、Railway 等平台
4. **发布插件**：提交到 Chrome Web Store

## 需要帮助？

检查以下文件中的详细文档：
- `packages/extension/README.md` - 插件详细说明
- `packages/backend/README.md` - 后端 API 文档
- `README.md` - 项目总览

祝使用愉快！🎉

