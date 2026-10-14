/**
 * 受保护页面的守卫：页面里声明 `definePageMeta({ middleware: 'auth' })`。
 *
 * **它和 `permission` 中间件的分工**：
 * - 本中间件管「有没有登录」—— 没登录就送 `/login`；
 * - `permission` 管「登录了但有没有这个权限键」，且它目前仍是「没有权限数据就放行」的过渡策略。
 *
 * 与 `permission` 一样，守卫**只看 cookie 恢复出来的会话**，所以 SSR 阶段就能判断，
 * 不会出现"先渲染页面再跳走"的闪烁。真正的权限判定仍在后端，前端守卫只挡直接敲 URL。
 *
 * 守卫里**不额外记标记**：`hydrate()` 自己就是"已有会话或没有令牌就直接返回"，
 * 无令牌时不会发出请求，所以不必再用一个 `useState` 防重复。
 */
export default defineNuxtRouteMiddleware(async () => {
  const { token, isAuthed, hydrate } = useAuthState()

  // 有令牌但会话还没恢复（直接打开受保护 URL 时的 SSR 阶段）→ 先恢复再判断
  if (!isAuthed.value && token.value) {
    await hydrate()
  }

  if (!isAuthed.value) {
    return navigateTo('/login')
  }
})
