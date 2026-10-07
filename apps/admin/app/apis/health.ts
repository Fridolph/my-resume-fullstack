import { useNuxtApp } from '#app'

/** `GET /api/health` 的业务数据（请求层已解包 `data`） */
export interface HealthPayload {
  status: string
  service: string
  uptime: number
}

/**
 * 后端心跳。只负责取数，不持有状态、不做缓存决策——
 * 缓存与失效由 colada query 层负责（见 `~/composables/useHealthQuery.ts`）。
 */
export function fetchHealth() {
  const { $request } = useNuxtApp()

  return $request<HealthPayload>('/health')
}
