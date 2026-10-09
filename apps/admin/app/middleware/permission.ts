/**
 * 页面级权限守卫（**骨架**）。
 *
 * 用法：页面里声明需要哪些权限键 ——
 *
 * ```ts
 * definePageMeta({ middleware: 'permission', permissions: ['Admin.Console:view'] })
 * ```
 *
 * ⚠️ **过渡策略：没有权限数据时放行**。admin 的权限尚未接后端（`permissionKeys` 为空），
 * 现在若"空即拦"会把所有页面挡掉、连开发都做不了。
 * **接后端 auth 后必须改成"空即拦"** —— 这一步与 web 的 `useAuthState.hydrate()` 一起做
 * （见 `docs/dev/identity-and-access.md` §3.4 的三层落点）。
 */
export default defineNuxtRouteMiddleware(to => {
  const { hasPermission, permissionKeys } = usePermission()

  const required = (to.meta.permissions as string[] | undefined) ?? []
  if (!required.length) {
    return
  }

  if (!permissionKeys.value.length) {
    // 过渡期：没有权限数据就不拦（留一条日志便于排查"为什么没拦住"）
    if (import.meta.dev) {
      console.warn(`[permission] ${to.path} 需要 ${required.join(', ')}，但当前无权限数据 —— 已放行（过渡策略）`)
    }
    return
  }

  if (!hasPermission(required)) {
    return navigateTo('/login')
  }
})
