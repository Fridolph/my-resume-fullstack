/**
 * 后端统一响应契约的唯一来源：`packages/common`。
 *
 * 约定：`{ success, data, message, timestamp }`，失败时额外带 `statusCode` / `path`。
 * 请求层（`plugins/httpRequest.ts`）负责把 `data` 解包出来，
 * 业务代码与 colada query 函数只见到 `data`，不直接处理这层包装。
 */
export type { ApiErrorBody, ApiResponse } from '@rs/common'

/**
 * `$fetch` / `$api` 的自定义请求选项（module augmentation）。
 *
 * 这样调用方可以声明"这次请求别按默认策略处理"，而不用 `as any`
 * （见 `docs/web/05_请求错误处理_设计.md` §4）：
 *
 * ```ts
 * await $api('/health', { silent: true })                    // 不触发 api:error hook
 * await $api('/resume/publish', { errorPolicy: 'manual' })   // 同上，语义上强调"调用方自己管"
 * ```
 */
declare module 'ofetch' {
  interface FetchOptions {
    /** 该请求**不触发** `api:error` hook（心跳、预取、探测类请求用） */
    silent?: boolean
    /** 错误策略；`manual` 与 `silent` 等效，只是语义更强调"调用方自己处理" */
    errorPolicy?: 'default' | 'manual'
  }
}
