/**
 * `@template/common` —— 跨端共享的**框架无关**能力（纯 TS，可脱离 Vue 单测）。
 *
 * 目前只有一个域：
 * - `api/`：API 契约（响应形状 / 错误归一化与策略 / 请求头 / 中断识别）
 *
 * 判据：**能不能脱离 Vue 运行** —— 能 → 这里；不能（含模板 / 依赖 Nuxt UI）→ `packages/ui`。
 */
export * from './api/constants.js'
export * from './api/types.js'
export * from './api/response.js'
export * from './api/error.js'
export * from './api/request.js'
