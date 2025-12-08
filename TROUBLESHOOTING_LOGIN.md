# 登录问题排查指南

## 🔴 问题：点击"立即登录"后提示"登录失败，请重试"

### 根本原因
Chrome 扩展使用 OAuth 2.0 PKCE 流程进行 Google 登录，需要将扩展的回调 URL 添加到 Supabase 的白名单中。

### ✅ 解决方案

#### 1. 确认扩展 ID
当前扩展 ID：`fcimokplgiejpafehfmfcpkdjpibnnkj`
回调 URI：`https://fcimokplgiejpafehfmfcpkdjpibnnkj.chromiumapp.org/`

#### 2. 配置 Supabase

**步骤：**

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目：`hmtjgfpnpxdjbxlfqqmc`
3. 左侧菜单点击 **Authentication** 
4. 点击 **URL Configuration**
5. 找到 **Redirect URLs** 部分
6. 点击 **Add URL** 添加以下地址：
   ```
   https://fcimokplgiejpafehfmfcpkdjpibnnkj.chromiumapp.org/*
   ```
7. 点击 **Save** 保存

#### 3. 启用 Google Provider（如未启用）

**步骤：**

1. 在 Supabase Dashboard 中
2. 左侧菜单点击 **Authentication** 
3. 点击 **Providers**
4. 找到 **Google**，确保已启用
5. 如未配置，需要：
   - 创建 Google OAuth 应用（[Google Cloud Console](https://console.cloud.google.com/)）
   - 在 Google OAuth 应用的授权重定向 URI 中添加：
     ```
     https://hmtjgfpnpxdjbxlfqqmc.supabase.co/auth/v1/callback
     ```
   - 将 Client ID 和 Client Secret 填入 Supabase

#### 4. 验证配置

重新加载扩展并尝试登录：

1. 打开 `chrome://extensions/`
2. 找到 **CoLink** 扩展，点击刷新图标
3. 打开任意 LinkedIn 页面
4. 打开侧边栏（点击扩展图标）
5. 点击"立即登录"
6. 应该会弹出 Google 授权窗口

### 🐛 调试步骤

如果配置后仍然失败，请按以下步骤调试：

#### 1. 打开扩展 DevTools

1. 在 LinkedIn 页面打开 CoLink 侧边栏
2. 右键侧边栏界面
3. 选择"检查"或"Inspect"
4. 切换到 **Console** 标签页

#### 2. 点击登录并查看日志

日志应该包含以下信息：

```
🔐 开始登录流程
📍 回调 URI: https://fcimokplgiejpafehfmfcpkdjpibnnkj.chromiumapp.org/
🔗 授权 URL: https://hmtjgfpnpxdjbxlfqqmc.supabase.co/auth/v1/authorize?...
✅ 授权窗口返回: https://fcimokplgiejpafehfmfcpkdjpibnnkj.chromiumapp.org/?code=...
✅ 获取到授权码
🔄 开始交换 token...
✅ Token 交换成功，用户: your-email@gmail.com
💾 会话已保存
```

#### 3. 常见错误信息

**错误 1：`unauthorized_client`**
- **原因**：回调 URL 未在 Supabase 白名单中
- **解决**：按照上面步骤 2 配置 Supabase Redirect URLs

**错误 2：`access_denied`**
- **原因**：用户取消了 Google 授权
- **解决**：重新点击登录并在 Google 授权页面点击"允许"

**错误 3：`交换会话失败: 400 ...`**
- **原因**：PKCE 参数错误或 code 已失效
- **解决**：确保扩展配置正确，重新尝试登录

**错误 4：`授权窗口打开失败`**
- **原因**：扩展权限不足或 Supabase URL 不可访问
- **解决**：检查 `manifest.json` 中的 `permissions` 和 `host_permissions`

### 📝 相关文件

- 登录逻辑：`packages/extension/utils/auth.js`
- 扩展配置：`packages/extension/manifest.json`
- 生成配置：`packages/extension/utils/config.generated.js`

### 🆘 仍然无法解决？

1. **查看完整错误信息**：在 Console 中复制完整的错误堆栈
2. **检查网络请求**：在 DevTools 的 Network 标签页查看失败的请求
3. **联系支持**：wx: yourkin666

## 📌 验证清单

- [ ] Supabase 项目 `hmtjgfpnpxdjbxlfqqmc` 可以正常访问
- [ ] Redirect URL `https://fcimokplgiejpafehfmfcpkdjpibnnkj.chromiumapp.org/*` 已添加
- [ ] Google Provider 已在 Supabase 中启用并配置
- [ ] Chrome 扩展已重新加载
- [ ] 扩展 ID 为 `fcimokplgiejpafehfmfcpkdjpibnnkj`（在 `chrome://extensions/` 中确认）
- [ ] 后端服务正常运行（`http://localhost:3000`）
- [ ] `.env` 文件包含正确的 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_JWT_SECRET`

## 🎯 成功标志

登录成功后，你应该看到：

1. 侧边栏顶部显示用户邮箱和头像
2. "找相似"按钮变为可用状态
3. 收藏页面的操作按钮可用
4. 后续 API 请求会自动携带 Bearer token

---

最后更新：2025-01-08

