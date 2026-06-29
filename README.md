# CrazyClaw

CrazyClaw 是一个本地优先的 AI Agent 管理与会话项目。当前仓库采用 pnpm workspace，包含前端管理台、NestJS 后端服务和可复用的 core 包。

## 项目结构

```text
apps/
  server/   NestJS API 服务，负责读取 crazyclaw.json、管理配置和提供 chat 流式接口
  webui/    Umi Max + Ant Design Pro 前端，负责会话、Agents、Models、Tools 管理页面
packages/
  core/     Agent 运行相关的基础能力，包括配置读取和模型初始化
```

## 当前进度

- Models：已完成后端 CRUD、前端管理页面和配置落盘。
- Agents：已完成后端 CRUD、前端管理页面，配置格式已调整为数组。
- Tools：已完成后端 CRUD；前端当前只展示工具并支持启用/停用；`crazyclaw.json` 中按对象存储。
- Chat：已接入真实后端接口，使用 OpenAI-compatible `POST + text/event-stream` 流式响应；同时保留 `GET /api/chat?input=...` 作为测试入口。
- Core：已迁移 `readConfig`，支持按 agent/model 读取配置，并接入基础流式模型初始化。

## 开发命令

```bash
pnpm install
pnpm dev
```

常用检查：

```bash
pnpm --filter @carzyclaw/server typecheck
pnpm --filter @carzyclaw/webui typecheck
pnpm --filter @crazyclaw/core typecheck
```

桌面壳：

```bash
pnpm desktop:dev
pnpm desktop:build
```

`apps/desktop` 是 Tauri v2 壳，只负责窗口和启动/关闭本地 server sidecar。业务逻辑仍在 `apps/webui`、`apps/server` 和 `packages/core` 中。

## 配置

前端后端地址在 `apps/webui/.env` 中配置：

```env
UMI_APP_API_BASE_URL=http://localhost:3000
```

## 说明

当前重点仍是配置管理和会话链路打通，真实工具执行、权限模型、工具参数 schema 和更完整的运行时编排还未实现。
