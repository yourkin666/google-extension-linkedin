# CoLink 测试指南

## 前提条件

✅ 后端服务已启动（`pnpm dev:backend`）  
✅ Chrome 插件已加载  
✅ RapidAPI Key 已配置

## 测试清单

### 1️⃣ 后端 API 测试

#### 测试健康检查

```bash
curl http://localhost:3000/health
```

**预期结果：**
```json
{"status":"ok","timestamp":"2025-12-02T..."}
```

#### 测试获取相似用户

```bash
curl "http://localhost:3000/api/linkedin/similar-by-username?username=satyanadella"
```

**预期结果：**
```json
{
  "success": true,
  "data": {
    "currentUser": {
      "username": "satyanadella",
      "urn": "..."
    },
    "similarProfiles": [
      {
        "id": "...",
        "publicIdentifier": "...",
        "firstName": "...",
        "lastName": "...",
        "headline": "...",
        "profilePictureURL": "..."
      }
    ]
  }
}
```

**如果失败：**
- 检查 `.env` 文件中的 API Key
- 检查 RapidAPI 配额是否用完
- 查看后端终端日志

---

### 2️⃣ Chrome 插件测试

#### 测试 Content Script

1. 打开 LinkedIn 个人主页：`https://www.linkedin.com/in/satyanadella/`
2. 按 F12 打开开发者工具
3. 查看 Console，应该看到：
   ```
   LinkedIn 招聘助手 Content Script 已加载
   ```
4. 打开 Application → Storage → Local Storage → chrome-extension://...
5. 查看 `currentUsername` 是否为 `satyanadella`

**如果失败：**
- 检查插件是否正确加载
- 刷新插件后重新加载页面

---

#### 测试 Background Service

1. 访问 `chrome://extensions/`
2. 找到插件，点击 "service worker"
3. 在打开的控制台中，应该看到：
   ```
   LinkedIn 招聘助手后台服务已启动
   ```

---

#### 测试 Side Panel

1. 在 LinkedIn 个人主页，点击插件图标
2. 侧边栏应该打开并显示加载动画
3. 几秒后应该显示：
   - 统计信息（待筛选 X、已收藏 0）
   - 当前推荐用户卡片
   - 操作按钮

**预期界面：**
- ✅ 用户头像显示
- ✅ 用户姓名显示
- ✅ 用户简介显示
- ✅ 按钮可点击

**如果失败：**
- 右键侧边栏 → "检查" → 查看 Console 错误
- 检查后端服务是否运行
- 检查网络请求（Network tab）

---

### 3️⃣ 功能测试

#### 测试"跳过"功能

1. 点击 **"👋 NO"** 按钮
2. 预期行为：
   - ✅ 页面自动跳转到下一个推荐用户
   - ✅ 侧边栏更新为新用户信息
   - ✅ "待筛选"数量减 1

#### 测试"收藏"功能

1. 点击 **"✅ 收藏"** 按钮
2. 预期行为：
   - ✅ 页面自动跳转到下一个推荐用户
   - ✅ "已收藏"数量增加 1
   - ✅ 侧边栏更新为新用户信息

#### 测试"找相似"功能

1. 点击 **"🔍 根据 Ta 找相似"** 按钮
2. 预期行为：
   - ✅ 显示加载动画
   - ✅ 基于当前推荐用户，加载新的相似用户列表
   - ✅ "待筛选"数量更新

#### 测试收藏列表

1. 切换到 **"已收藏"** Tab
2. 预期行为：
   - ✅ 显示所有收藏的用户
   - ✅ 每个用户有"访问"和"移除"按钮

3. 点击 **"访问"** 按钮
   - ✅ 页面跳转到该用户的 LinkedIn 主页

4. 点击 **"移除"** 按钮
   - ✅ 用户从列表中消失
   - ✅ "已收藏"数量减 1

#### 测试非个人主页

1. 访问 LinkedIn 首页：`https://www.linkedin.com/feed/`
2. 打开侧边栏
3. 预期行为：
   - ✅ 显示提示："这里不是用户主页，没法找相似哦～"

---

### 4️⃣ 边界情况测试

#### 测试 API 错误处理

1. 关闭后端服务
2. 在 LinkedIn 个人主页打开侧边栏
3. 预期行为：
   - ✅ 显示错误提示："加载失败，请检查后端服务是否运行 🔧"

#### 测试推荐列表用完

1. 连续点击"跳过"，直到所有推荐用完
2. 预期行为：
   - ✅ 显示提示："🎉 所有推荐已看完！"

#### 测试无相似用户

如果某个用户没有相似推荐：
- ✅ 显示："没有找到相似用户 😢"

---

### 5️⃣ 性能测试

#### 测试加载速度

- ⏱️ 打开侧边栏到显示数据：应在 2-5 秒内
- ⏱️ 点击操作按钮后页面跳转：应立即响应

#### 测试内存占用

1. 打开 Chrome 任务管理器（Shift + Esc）
2. 查看插件内存占用
3. 正常范围：< 50MB

---

## 常见问题排查

### 问题：API 调用失败

**检查项：**
1. 后端是否运行？`curl http://localhost:3000/health`
2. API Key 是否正确？查看 `backend/.env`
3. 网络是否正常？
4. RapidAPI 配额是否用完？登录 RapidAPI 查看

### 问题：侧边栏空白

**检查项：**
1. 右键侧边栏 → "检查" → 查看 Console 错误
2. manifest.json 是否配置正确？
3. 是否在 LinkedIn 域名下？

### 问题：页面不跳转

**检查项：**
1. 检查 Chrome 是否阻止了跳转
2. 查看 Console 是否有权限错误
3. 确认 manifest.json 中 `activeTab` 权限已配置

---

## 自动化测试（可选）

如果需要更严格的测试，可以添加：

### 后端单元测试

```bash
cd packages/backend
# 安装测试框架
pnpm add -D vitest
# 编写测试文件
# src/__tests__/linkedin.test.ts
```

### 前端 E2E 测试

使用 Puppeteer 或 Playwright 自动化测试插件。

---

## 测试完成检查表

- [ ] 后端健康检查通过
- [ ] API 能正常返回相似用户
- [ ] Content Script 能识别 LinkedIn 页面
- [ ] 侧边栏能正常打开和显示
- [ ] "跳过"功能正常
- [ ] "收藏"功能正常
- [ ] "找相似"功能正常
- [ ] 收藏列表能正常显示和操作
- [ ] 非个人主页显示正确提示
- [ ] 错误情况处理正常

全部通过后，项目就可以正常使用了！🎉

