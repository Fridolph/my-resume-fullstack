/**
 * `@rs/common` —— 跨端共享的**框架无关**能力（纯 TS，可脱离 Vue 单测）。
 *
 * 目前两个域：
 * - `api/`：API 契约（响应形状 / 错误归一化与策略 / 请求头 / 中断识别）
 * - `resume/`：简历契约（文档 schema）、展示域类型（`content.ts`）、文档 ⇄ 展示内容的映射
 *   （`content-mapper.ts`）与区块定义（`sections.ts`）；`ui/form-schema.ts` 是 schema 驱动表单的数据描述
 *
 * 判据：**能不能脱离 Vue 运行** —— 能 → 这里；不能（含模板 / 依赖 Nuxt UI）→ `packages/ui`。
 */
export * from './api/constants.js'
export * from './api/types.js'
export * from './api/response.js'
export * from './api/error.js'
export * from './api/request.js'
export * from './ui/form-schema.js'
export * from './resume/capabilities.js'
export * from './resume/document.js'
export * from './resume/content.js'
export * from './resume/content-mapper.js'
export * from './resume/sections.js'
