/**
 * 后端统一响应契约的唯一来源：`packages/common`。
 *
 * 约定：`{ success, data, message, timestamp }`，失败时额外带 `statusCode` / `path`。
 * 请求层（`plugins/httpRequest.ts`）负责把 `data` 解包出来，
 * 业务代码与 colada query 函数只见到 `data`，不直接处理这层包装。
 */
export type { ApiErrorBody, ApiResponse } from "@template/common";
