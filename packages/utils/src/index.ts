/**
 * `@rs/utils` —— 跨端共享的**纯工具函数**。
 *
 * 判据：不依赖 Vue（依赖 Vue 的进 `packages/ui`）。它带上第三方工具库
 * （`a-calc` / `libphonenumber-js` / `zod`），所以与 `@rs/common` 的分工是：
 * `common` 放**契约与框架无关的基础能力**（API 契约、简历契约与校验），
 * 这里放**通用工具**（格式化、校验、调试、电话元数据…）。
 */
export * from './company-validation.js'
export * from './design-console.js'
export * from './error-handler.js'
export * from './fileValidation.js'
export * from './number.js'
export * from './pdf.js'
export * from './phoneMetaData.js'
export * from './zodFunc.js'
export * from './file-upload.js'
