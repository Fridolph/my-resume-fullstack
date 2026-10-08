import type { ApiErrorBody } from "~/types/api";

/**
 * 请求上下文与统一错误工具。
 *
 * 与 `apps/admin` 保持同一份实现（见 docs/dev/data-layer.md）：
 * 第三次出现同款实现时，再考虑抽到 `packages/*` 共享。
 */

/** 登录 / 访客 token 存 cookie 的 key（与 admin、后端对齐） */
export const TOKEN_COOKIE_KEY = "my-resume.token";

/** 一次请求所需的鉴权上下文 */
export interface RequestContext {
  isLoggedIn: boolean;
  token: string;
}

/** 从当前 Nuxt 上下文（cookie）收集鉴权信息；只在有 Nuxt 上下文处调用 */
export function resolveRequestContext(): RequestContext {
  const token = useCookie<string | null>(TOKEN_COOKIE_KEY, { default: () => null }).value || "";

  return {
    isLoggedIn: !!token,
    token,
  };
}

/** 组装公共请求头（有值才带）；token 由调用方显式传入，避免依赖异步上下文 */
export function buildRequestHeaders(ctx: { token?: string | null }): Record<string, string> {
  const headers: Record<string, string> = {};

  if (ctx.token) {
    headers.Authorization = `Bearer ${ctx.token}`;
  }

  return headers;
}

/** 归一化后的错误载荷 */
export interface ApiErrorPayload {
  message?: string;
  statusCode?: number;
  data?: unknown;
}

/** 把后端错误包装成可读的 ApiError，调用方可以读 statusCode / data */
export function createApiError(payload: ApiErrorPayload) {
  const statusCode = payload.statusCode;
  const message = payload.message || "Request failed";
  const label = statusCode != null ? `[API ${statusCode}] ${message}` : `[API] ${message}`;
  const error = new Error(label) as Error & {
    name: string;
    data: ApiErrorPayload;
    statusCode?: number;
  };
  error.name = "ApiError";
  error.data = payload;
  if (typeof statusCode === "number" && Number.isFinite(statusCode)) {
    error.statusCode = statusCode;
  }
  return error;
}

/** 从未知 err 上取出归一化后的错误载荷 */
export function getApiErrorData(err: unknown): ApiErrorPayload | undefined {
  if (!err || typeof err !== "object") {
    return undefined;
  }
  const data = (err as { data?: unknown }).data;
  if (data && typeof data === "object") {
    return data as ApiErrorPayload;
  }
  return undefined;
}

/** 控制台 / toast 用的短文案 */
export function getApiErrorMessage(err: unknown, fallback = "Error") {
  const data = getApiErrorData(err);
  if (typeof data?.message === "string" && data.message) {
    return data.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

/** 按状态码触发 Nuxt hook，方便全局弹 toast / 跳登录 */
export async function applyApiErrorHooks(
  payload: ApiErrorBody,
  nuxtApp: ReturnType<typeof useNuxtApp>,
) {
  const statusCode = Number(payload.statusCode);
  const known = [400, 401, 403, 404, 500, 502, 503, 504];
  const hook = (known.includes(statusCode) ? `api:error:${statusCode}` : "api:error") as any;
  await nuxtApp.callHook(hook, payload as any);
}
