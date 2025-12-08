# Supabase 用户数据查看指南

## 🎯 快速访问

**项目地址：** https://supabase.com/dashboard/project/hmtjgfpnpxdjbxlfqqmc

---

## 📊 方法 1：通过 Dashboard 查看（最简单）

### 步骤：

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择项目：`hmtjgfpnpxdjbxlfqqmc`

2. **进入用户管理**
   - 左侧菜单点击 **Authentication** 🔐
   - 点击 **Users** 👥

3. **查看用户列表**
   
   你将看到所有注册用户的表格，包含：
   
   | 列名 | 说明 | 示例 |
   |------|------|------|
   | Email | 用户邮箱 | `yourname@gmail.com` |
   | Provider | 登录方式 | `google` |
   | Created | 注册时间 | `2025-01-08 10:30:00` |
   | Last Sign In | 最后登录时间 | `2025-01-08 15:45:00` |
   | User ID | 用户唯一标识 | `550e8400-e29b-41d4-a716-...` |

4. **查看用户详情**
   
   点击任意用户行，可以看到：
   
   ### User Metadata（用户元数据）
   ```json
   {
     "email": "yourname@gmail.com",
     "email_verified": true,
     "name": "Your Name",
     "picture": "https://lh3.googleusercontent.com/...",
     "sub": "google-oauth2|123456789"
   }
   ```
   
   ### Identities（身份信息）
   - Provider: `google`
   - Identity ID: Google 账号 ID
   - Created: 首次连接时间
   
   ### Sessions（活跃会话）
   - 查看当前活跃的登录会话
   - 可以手动撤销会话

---

## 💻 方法 2：使用 SQL Editor 查询（高级）

### 步骤：

1. 左侧菜单点击 **SQL Editor** 📝

2. 点击 **New query**

3. 输入以下 SQL 查询：

### 查询所有用户基本信息

```sql
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'picture' as avatar
FROM auth.users
ORDER BY created_at DESC;
```

### 查询最近登录的用户

```sql
SELECT 
  email,
  last_sign_in_at,
  sign_in_count
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '7 days'
ORDER BY last_sign_in_at DESC;
```

### 查询 Google 登录的用户

```sql
SELECT 
  u.email,
  u.created_at,
  i.provider,
  i.created_at as identity_created_at
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE i.provider = 'google'
ORDER BY u.created_at DESC;
```

### 查询用户的完整元数据

```sql
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data
FROM auth.users
WHERE email = 'yourname@gmail.com';  -- 替换为你的邮箱
```

---

## 🔍 方法 3：通过 Table Editor 查看

1. 左侧菜单点击 **Table Editor** 📋

2. 在 Schema 下拉框选择 **auth**

3. 选择表：
   - **users** - 用户基本信息
   - **identities** - OAuth 身份信息
   - **sessions** - 登录会话
   - **refresh_tokens** - 刷新令牌

4. 点击任意行查看详细数据

---

## 📋 用户数据结构说明

### `auth.users` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 用户唯一标识 |
| `email` | String | 用户邮箱 |
| `encrypted_password` | String | 加密密码（OAuth 用户为空）|
| `email_confirmed_at` | Timestamp | 邮箱验证时间 |
| `created_at` | Timestamp | 注册时间 |
| `updated_at` | Timestamp | 更新时间 |
| `last_sign_in_at` | Timestamp | 最后登录时间 |
| `raw_user_meta_data` | JSONB | 用户元数据（Google 返回的信息）|
| `raw_app_meta_data` | JSONB | 应用元数据 |

### `raw_user_meta_data` 内容（Google 登录）

```json
{
  "iss": "https://accounts.google.com",
  "azp": "...",
  "aud": "...",
  "sub": "123456789",
  "email": "yourname@gmail.com",
  "email_verified": true,
  "name": "Your Name",
  "picture": "https://lh3.googleusercontent.com/.../photo.jpg",
  "given_name": "Your",
  "family_name": "Name",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 🛠️ 实用操作

### 删除用户

1. 在 **Authentication** → **Users** 中
2. 点击用户行最右侧的 **...** 菜单
3. 选择 **Delete User**
4. 确认删除

### 撤销用户会话（强制登出）

1. 点击用户进入详情页
2. 在 **Sessions** 部分
3. 点击会话旁的 **Revoke** 按钮

### 手动创建用户（测试用）

1. 在 **Authentication** → **Users** 中
2. 点击右上角 **Invite User**
3. 输入邮箱
4. 系统会发送邀请邮件

---

## 🔐 验证当前登录用户

### 在扩展中验证

打开浏览器 DevTools (F12)，在 Console 输入：

```javascript
// 查看存储的会话
chrome.storage.local.get('supabaseSession', (result) => {
  console.log('当前会话:', result.supabaseSession);
  if (result.supabaseSession) {
    console.log('用户邮箱:', result.supabaseSession.user?.email);
    console.log('用户 ID:', result.supabaseSession.user?.id);
    console.log('Access Token:', result.supabaseSession.access_token?.substring(0, 20) + '...');
    console.log('过期时间:', new Date(result.supabaseSession.expires_at * 1000));
  }
});
```

### 查看 JWT Token 内容

访问：https://jwt.io/

将你的 `access_token` 粘贴到 "Encoded" 框中，即可解码查看内容。

---

## 📊 统计查询

### 用户总数

```sql
SELECT COUNT(*) as total_users FROM auth.users;
```

### 今天注册的用户

```sql
SELECT COUNT(*) as today_signups 
FROM auth.users 
WHERE created_at::date = CURRENT_DATE;
```

### 本周活跃用户

```sql
SELECT COUNT(*) as active_this_week
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '7 days';
```

### 按登录方式统计

```sql
SELECT 
  i.provider,
  COUNT(*) as user_count
FROM auth.identities i
GROUP BY i.provider
ORDER BY user_count DESC;
```

---

## 🚨 常见问题

### Q1: 看不到新注册的用户？

**解决方法：**
- 刷新页面（F5）
- 检查是否选择了正确的项目
- 确认登录流程是否真的成功（查看 Console 日志）

### Q2: 用户元数据为空？

**原因：**
- OAuth 首次登录时 Google 可能不返回所有字段
- 用户未授权某些权限（如头像、姓名）

**解决方法：**
- 在 Google OAuth 设置中确保请求了 `profile` scope
- 查看 `auth.identities` 表中的 `identity_data` 字段

### Q3: 如何导出用户数据？

**步骤：**
1. 在 SQL Editor 中运行查询
2. 点击结果表格右上角的 **Download CSV** 按钮
3. 或使用 Supabase CLI：
   ```bash
   supabase db dump --project-id hmtjgfpnpxdjbxlfqqmc --data-only --schema auth
   ```

---

## 📞 需要帮助？

- **Supabase 文档：** https://supabase.com/docs/guides/auth
- **社区论坛：** https://github.com/supabase/supabase/discussions
- **本项目联系：** wx: yourkin666

---

最后更新：2025-01-08

