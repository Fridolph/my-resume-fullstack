/** `GET /api/health` 的业务数据（请求层已解包 `data`） */
export interface HealthPayload {
  status: string
  service: string
  uptime: number
}

/**
 * 后端心跳。
 *
 * 心跳属于**"每次都要最新、不该缓存"**的一类 → 调用点用 `useAsyncData`（SSR 直出 + 手动刷新），
 * **不进 colada 缓存**。真正"频繁但不常变"的数据（简历 / 用户信息 / 授权信息）才用 `useQuery`。
 *
 * 请求本身走统一请求层：全局 `$fetch` 已被 `packages/ui` 的插件接管（鉴权头 / 解包 / 公共错误处理）。
 */
export function fetchHealth() {
  const { $api } = useNuxtApp()

  return $api<HealthPayload>('/health')
}
