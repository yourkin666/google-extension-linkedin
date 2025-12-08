# 仓库指南

## 项目结构与模块组织
- 单仓多包（Monorepo），由 `pnpm` 管理。
- `packages/backend` — Fastify API（TypeScript）。源码位于 `src/`，包含 `config/`、`routes/`、`services/`、`utils/`，构建产物输出到 `dist/`。
- `packages/extension` — Chrome 插件（原生 JS）。目录包含 `background/`、`content/`、`sidepanel/`、`floating-panel/`、`utils/`、`icons/`。
- 生成文件：`packages/extension/utils/config.generated.js`（禁止手动编辑）。

## 构建、测试与本地开发命令
- 前置：Node 18+、pnpm 8+。
- 根目录
  - `pnpm dev`：并行启动后端开发与扩展配置构建。
  - `pnpm build:backend` / `pnpm build:extension`：分别构建各包。
- 后端
  - `cd packages/backend && npm run dev`：使用 `tsx` 监听编译。
  - `npm run build && npm start`：编译并运行 `dist/index.js`。
- 插件
  - `cd packages/extension && npm run build:config`：从 `.env` 生成配置。
  - 在 Chrome 开发者模式下“加载已解压的扩展程序”，选择 `packages/extension`。

## 代码风格与命名规范
- 缩进 2 空格；必须使用分号；允许尾随逗号。
- TypeScript（后端）：启用 strict；优先使用 `unknown` 替代 `any`；类型/类用 PascalCase，变量/函数用 camelCase，环境常量用 UPPER_SNAKE。
- JavaScript（插件）：文件名用 kebab-case（如 `floating-panel.js`）；模块职责单一、体量精简。
- 日志：使用 Fastify/Pino（见 `src/utils/logger.ts`）；配置集中于 `src/config`。

## 架构原则（优雅/低耦合/高扩展）
- 模块边界清晰：路由只依赖服务接口；服务不反向依赖路由。
- 依赖注入：通过工厂注入实现（见 `createLinkedInService`）。
- 组合优于继承、纯函数优先；IO/网络放在边缘层，便于测试与替换。

## 落地约定
- 接口定义：`packages/backend/src/services/types.ts`（`LinkedInService`）。
- 实现与注入：`services/linkedin.ts` 暴露 `createLinkedInService`；在 `src/index.ts` 通过 `fastify.register(..., { service })` 注入；`routes/linkedin.ts` 通过 `opts.service` 调用。
- 第三方适配：若更换外部 API，仅替换 `LinkedInService` 的实现，无需改动路由。


## 目录职责与放置规则（务必遵守）
- 后端 Backend（packages/backend/src）
  - `routes/`：仅处理 HTTP 入口与响应码；调用 `LinkedInService`，不写业务逻辑。
  - `services/`：业务与外部 API 组装；定义接口于 `services/types.ts`；实现放 `services/*.ts`。
  - `config/`：环境变量、日志与框架配置；不得出现业务逻辑。
  - `utils/`：纯工具（如 `logger.ts`）；不得进行网络/文件 IO。
  - `middleware/`：Fastify 钩子与拦截器；仅做横切关注点。
- 插件 Extension（packages/extension）
  - `background/`：事件与长生命周期逻辑；请求通过 `utils/api.js`；不操作页面 DOM。
  - `content/`：页面采集与消息分发；不直接请求网络/存储。
  - `sidepanel/`、`floating-panel/`：UI 与状态管理；调用 `utils/`；不直接使用底层 Chrome API。
  - `utils/`：存储、API、配置等可复用模块；`config.generated.js` 为生成文件。
  - `scripts/`：Node 脚本（仅构建/生成用途）。

示例：新增“根据公司找相似”接口
- 在 `services/types.ts` 增加 `getSimilarByCompany(companyId)`。
- 在 `services/linkedin.ts` 实现并复用通用请求。
- 在 `routes/` 新增路由，调用接口方法并返回统一结构。
- 当前未配置测试。若新增：
  - 后端：推荐 Vitest/Jest；放置于 `packages/backend/tests`；文件名 `*.test.ts`；模拟网络 I/O。
  - 插件：将纯函数提取到 `utils/` 进行测试；避免依赖浏览器全局。
  - 引入后补充根或包内 `pnpm test` 脚本。


## 安全与配置提示
- 后端所需环境变量：`PORT`、`RAPIDAPI_KEY`、`RAPIDAPI_HOST`。
- 插件配置由 `scripts/build-config.js` 基于 `.env` 生成；切勿手改 `config.generated.js`。

always response in '中文'
