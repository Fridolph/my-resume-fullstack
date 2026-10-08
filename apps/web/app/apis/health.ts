import { useNuxtApp } from "#app";

/** `GET /api/health` 的业务数据（请求层已解包 `data`） */
export interface HealthPayload {
  status: string;
  service: string;
  uptime: number;
}

/** 后端心跳：只取数，缓存与失效交给 colada 层 */
export function fetchHealth() {
  const { $request } = useNuxtApp();

  return $request<HealthPayload>("/health");
}
