/**
 * 启动装配：会话 / 角色 / 语言。
 *
 * **为什么用 plugin 而不是 Provider 组件**（见 `docs/dev/identity-and-access.md` §3.3）：
 * plugin 在 **SSR 与客户端同一处**执行，两边共享同一套恢复逻辑，避免逻辑分叉；
 * 而 `useState` 本身就是"请求级全局态"（每请求独立 + 自动水合），不需要再包一层 Provider。
 *
 * 将来接后端时，把「读 cookie → 请求 session / 权限 → 写 colada 缓存」挂在这里，
 * 其余判断代码（`usePermission` / `PermissionWrapper`）零改动。
 */
export default defineNuxtPlugin(() => {
  const { hydrate, migrateLegacySession } = useAuthState()
  const { hydrate: hydrateLocale } = useLocale()

  hydrate()
  hydrateLocale()
  // 只在客户端生效（内部有 import.meta.client 守卫）
  migrateLegacySession()
})
