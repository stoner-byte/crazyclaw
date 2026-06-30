# WebUI 开发准则

这个应用是 CrazyClaw 的轻量 React/Vite Web UI。

## 技术栈

- 使用 React、React Router、Vite、TypeScript、Ant Design、Ant Design X、`lucide-react` 和 CSS Modules。
- 保持 WebUI 轻量，路由、应用壳、请求和样式都优先用当前技术栈内的方案完成。
- 优先使用已有依赖，不要为了很小的功能新增库。

## 目录结构

- 路由放在 `src/routes`。
- 应用壳和 workspace tabs 布局放在 `src/layouts`。
- 页面代码放在 `src/pages/<page>/`。
- 页面局部样式文件使用 `styles.module.css`。
- 共享 API 请求放在 `src/services`。

## 样式

- 标准控件优先使用 AntD 组件。
- 图标按钮和导航图标使用 `lucide-react`。
- 页面和组件样式使用 CSS Modules。
- 产品样式使用 `src/index.css` 里的全局 `--cc-*` 变量。
- 新增 `--cc-*` 颜色变量时，默认基于 GitHub light/dark theme 颜色体系生成。
- 可复用的页面壳样式优先用全局工具类，例如 `cc-page`。

## 主题

- 主题模式由 `src/theme.ts` 定义，并在 `src/app.tsx` 中提供。
- AntD 和 Ant Design X 通过 `XProvider` 共享同一套主题配置。
- 页面颜色优先使用 AntD token 或 `--cc-*` 变量，保证亮色和暗色模式都能适配。

## API

- HTTP 请求统一使用 `src/services/api.ts`。
- service 保持薄层封装：按服务端 API 边界拆分，一个领域一个文件。
- 保留服务端的 `ApiResponse<T>` 响应结构。

## 检查

功能改动提交前运行：

```bash
pnpm --filter @crazyclaw/webui typecheck
pnpm --filter @crazyclaw/webui lint
pnpm --filter @crazyclaw/webui build
```
