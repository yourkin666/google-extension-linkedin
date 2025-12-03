# 浮动窗口功能说明 📋

## 新增功能

### 1. 🎯 浮动用户详情窗口

在 LinkedIn 用户主页自动显示浮动窗口，提供快速访问用户详细信息的能力。

**功能特性：**
- ✅ 自动显示：进入用户主页自动弹出
- ✅ 可拖动：点击头部可拖动窗口到任意位置
- ✅ 可最小化：点击「－」按钮最小化到侧边标签
- ✅ 位置记忆：记住你上次拖动的位置

**显示内容：**
- 📧 邮箱地址（可一键复制）
- ✉️ 邮件模板预览（支持变量替换）
- 💼 工作经历（从页面抓取）
- 🎓 教育经历（从页面抓取）

### 2. 📝 邮件模板管理

在侧边栏新增「邮件模板」标签页，管理你的邮件模板。

**功能特性：**
- ➕ 创建模板：自定义邮件主题和内容
- ✏️ 编辑模板：随时修改已有模板
- 🗑️ 删除模板：删除不需要的模板
- 🔄 变量替换：支持动态变量

**可用变量：**
- `{name}` - 用户姓名
- `{title}` - 用户职位
- `{company}` - 用户公司（当前工作）
- `{location}` - 用户地点

**示例模板：**
```
主题: Exciting opportunity at {company}

内容:
Hi {name},

I hope this email finds you well. I came across your profile 
and was impressed by your experience at {company}.

Would you be open to a quick chat?

Best regards
```

### 3. 📧 邮箱获取 API（预留）

在 `utils/api.js` 中添加了 `getUserEmail()` 函数：

```javascript
const email = await getUserEmail(username);
```

**当前状态：**
- ⏳ 返回模拟邮箱数据
- 🔧 你可以替换为真实的邮箱 API

**如何替换真实 API：**
1. 打开 `utils/api.js`
2. 找到 `getUserEmail()` 函数
3. 替换 API 端点和处理逻辑

## 使用方法

### 查看用户详情

1. 打开任意 LinkedIn 用户主页
2. 浮动窗口自动显示在右侧
3. 查看用户信息：
   - 📧 点击邮箱旁的复制按钮可快速复制
   - ✉️ 选择邮件模板查看预览（变量自动替换）
   - 💼 滚动查看完整工作经历
   - 🎓 查看教育背景

### 管理窗口

- **拖动**：点击蓝色头部拖动到任意位置
- **最小化**：点击 `－` 按钮，窗口折叠为侧边小标签
- **恢复**：点击侧边标签重新展开
- **关闭**：点击 `×` 按钮关闭（切换页面会重新显示）

### 管理邮件模板

1. 点击插件图标打开侧边栏
2. 切换到「邮件模板」标签页
3. 操作：
   - **新建**：点击「➕ 新建模板」
   - **编辑**：点击模板卡片上的「编辑」按钮
   - **删除**：点击模板卡片上的「删除」按钮

### 在浮动窗口中使用模板

1. 在浮动窗口中选择模板
2. 查看实时预览（变量已替换为当前用户信息）
3. 复制邮箱准备发送

## 技术实现

### 文件结构

```
packages/extension/
├── floating-panel/           # 浮动窗口
│   ├── floating-panel.html  # 窗口结构
│   ├── floating-panel.css   # 窗口样式
│   └── floating-panel.js    # 窗口逻辑
├── utils/
│   ├── linkedin-scraper.js  # LinkedIn 数据抓取
│   └── api.js               # API 调用（含邮箱接口）
├── sidepanel/
│   ├── sidepanel.html       # 添加了模板管理标签
│   ├── sidepanel.css        # 添加了模板样式
│   └── sidepanel.js         # 添加了模板管理逻辑
└── content/
    └── content.js           # 集成浮动窗口显示
```

### 数据流

```
LinkedIn 页面
    ↓
content.js 检测用户主页
    ↓
创建浮动窗口 (iframe)
    ↓
linkedin-scraper.js 抓取页面数据
    ↓
floating-panel.js 渲染显示
    ↓
模板系统替换变量
    ↓
用户查看/复制信息
```

## 后续开发

### 邮箱 API 集成

**步骤：**

1. 获取邮箱 API（例如 Hunter.io、Snov.io 等）
2. 修改 `utils/api.js` 中的 `getUserEmail()` 函数：

```javascript
async function getUserEmail(username) {
  try {
    const response = await fetch(`YOUR_API_ENDPOINT?username=${username}`, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    });
    
    const result = await response.json();
    return result.email;
  } catch (error) {
    console.error('获取邮箱失败:', error);
    return null;
  }
}
```

3. 重新加载插件即可

### 发送邮件功能（未来）

可以添加以下功能：
- 集成 Gmail API 直接发送
- 或生成 mailto: 链接跳转到邮箱客户端
- 或集成第三方邮件发送服务

## 双模式工作流

现在插件支持两种工作模式：

### 模式 1：找相似候选人
**使用场景**：批量筛选候选人
- 点击「🔍 找相似」按钮（右下角）
- 打开侧边栏
- 开始筛选流程（NO / 收藏）
- 查看收藏列表

### 模式 2：查看用户详情
**使用场景**：深入了解单个候选人
- 打开用户主页
- 浮动窗口自动显示
- 查看详细信息
- 选择邮件模板
- 复制邮箱联系

两个模式可以**同时使用**，互不干扰！

## 常见问题

**Q: 浮动窗口没有显示？**
A: 确保你在 LinkedIn 用户主页（URL 包含 `/in/username`），刷新页面重试。

**Q: 工作经历显示不全？**
A: LinkedIn 页面需要完全加载。向下滚动页面加载更多内容后刷新。

**Q: 邮箱不准确？**
A: 当前使用模拟数据。需要集成真实邮箱 API（见上方说明）。

**Q: 如何备份模板？**
A: 模板存储在 Chrome Storage 中，与账号同步。或者导出 Chrome 用户数据。

## 反馈与支持

遇到问题请联系：**wx: yourkin666**

