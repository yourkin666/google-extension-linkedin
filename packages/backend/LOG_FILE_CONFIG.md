# 日志文件配置说明

## 📝 功能说明

后端现已支持将日志输出到文件，可以同时输出到**控制台**和**文件**。

## ⚙️ 配置方法

在 `.env` 文件中添加以下配置：

```env
# 是否启用文件日志
LOG_TO_FILE=true

# 是否输出到控制台（默认：true）
LOG_TO_CONSOLE=false

# 常规日志文件路径（可选）
LOG_FILE_PATH=./logs/app.log

# 错误日志文件路径（可选）
LOG_ERROR_FILE_PATH=./logs/error.log
```

## 📁 日志文件说明

启用文件日志后，会生成以下文件：

### 1. `logs/app.log` - 所有日志
包含所有级别的日志（info、warn、error 等），JSON 格式：

```json
{"level":30,"time":1234567890,"msg":"服务器启动"}
{"level":30,"time":1234567891,"reqId":"req-abc123","msg":"API 调用成功"}
{"level":50,"time":1234567892,"error":"...","msg":"API 调用失败"}
```

### 2. `logs/error.log` - 仅错误日志
只包含 error 和 fatal 级别的日志，便于快速定位问题：

```json
{"level":50,"time":1234567892,"error":{"message":"...","stack":"..."},"msg":"错误信息"}
```

## 🎯 使用场景

### 开发环境（默认：关闭文件日志）

适合实时调试，只在控制台查看：

```env
# 不需要配置，或显式关闭
LOG_TO_FILE=false
```

### 生产环境（推荐：开启文件日志）

便于问题追溯和日志分析：

```env
NODE_ENV=production
LOG_TO_FILE=true
LOG_LEVEL=info
LOG_PRETTY=false
```

### 调试模式（同时输出）

控制台美化显示 + 文件保存原始数据：

```env
LOG_TO_FILE=true
LOG_LEVEL=debug
LOG_PRETTY=true
```

## 📊 日志输出策略

| 场景 | 控制台 | app.log | error.log |
|------|--------|---------|-----------|
| 默认（无配置） | ✅ 所有日志 | ❌ | ❌ |
| `LOG_TO_FILE=true` | ✅ 美化显示 | ✅ JSON 格式 | ✅ 仅错误 |
| `LOG_TO_FILE=true` + `LOG_TO_CONSOLE=false` | ❌ | ✅ JSON 格式 | ✅ 仅错误 |
| 生产环境 + 仅文件 | ❌ | ✅ JSON 格式 | ✅ 仅错误 |

## 🔍 查看日志

### 实时查看所有日志

```bash
tail -f logs/app.log | jq
```

### 实时查看错误日志

```bash
tail -f logs/error.log | jq
```

### 查看最近 100 条日志

```bash
tail -n 100 logs/app.log | jq
```

### 搜索特定请求的日志

```bash
cat logs/app.log | jq 'select(.reqId=="req-abc123")'
```

### 查看特定时间范围的日志

```bash
cat logs/app.log | jq 'select(.time > 1234567890 and .time < 1234567999)'
```

### 统计错误类型

```bash
cat logs/error.log | jq -r '.error.message' | sort | uniq -c
```

## 📦 日志管理

### 日志轮转

建议使用 `logrotate` 或 PM2 来管理日志文件大小：

#### 使用 logrotate（Linux）

创建 `/etc/logrotate.d/backend`：

```
/path/to/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0640 user group
}
```

#### 使用 PM2

PM2 自动管理日志轮转：

```bash
pm2 start dist/index.js --name backend \
  --log logs/combined.log \
  --max-memory-restart 500M \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z"
```

### 手动清理日志

```bash
# 清空日志文件但保留文件
> logs/app.log
> logs/error.log

# 删除旧日志
find logs/ -name "*.log" -mtime +30 -delete
```

## ⚠️ 注意事项

1. **磁盘空间**：定期检查日志文件大小，避免占满磁盘
2. **性能影响**：文件 I/O 会有轻微性能开销，但 Pino 是异步写入，影响很小
3. **日志格式**：文件中的日志始终是 JSON 格式，便于程序解析
4. **权限问题**：确保应用有权限写入 `logs/` 目录
5. **容器部署**：Docker 容器中建议挂载日志目录到宿主机

## 🚀 快速开始

1. **启用文件日志**

编辑 `.env` 文件：

```env
LOG_TO_FILE=true
```

2. **重启服务**

```bash
npm run dev
```

3. **查看日志**

```bash
# 查看日志文件
ls -lh logs/

# 实时监控
tail -f logs/app.log | jq
```

## 📈 推荐配置

### 仅输出到文件（不输出到控制台）

```env
LOG_TO_FILE=true
LOG_TO_CONSOLE=false
LOG_FILE_PATH=./logs/app.log
LOG_ERROR_FILE_PATH=./logs/error.log
```

### 同时输出到控制台和文件

```env
LOG_TO_FILE=true
LOG_TO_CONSOLE=true
```

### 生产环境配置

```env
NODE_ENV=production
LOG_TO_FILE=true
LOG_TO_CONSOLE=false
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
LOG_ERROR_FILE_PATH=./logs/error.log
```

启动后会看到：

```
📋 当前配置：
  ...
  日志文件: 是
    - 常规日志: ./logs/app.log
    - 错误日志: ./logs/error.log
```

日志会自动输出到：
- 控制台：JSON 格式
- `logs/app.log`：所有日志（JSON）
- `logs/error.log`：仅错误日志（JSON）

完美！🎉

