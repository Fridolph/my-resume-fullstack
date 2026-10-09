import { PERMISSIONS } from '~/config/permissions'

/**
 * `/ai-talk` 的**页面级守卫**：需要 `AiTalk.Chat:view`，否则退回简历页。
 *
 * 为什么光有入口显隐不够：**组件不渲染 ≠ 路由进不去** —— 直接敲 URL 就绕过了 UI 层判断。
 * 所以"能不能进这个页面"必须由 middleware 兜（真正的权限仍然后端说了算，
 * 见 `docs/dev/identity-and-access.md` §3.4 的三层落点：UI / 页面 / 接口）。
 *
 * 权限来自 cookie 恢复的会话 → **SSR 阶段就能判断**，不会出现"先渲染再跳走"的闪烁。
 */
export default defineNuxtRouteMiddleware(() => {
  const { hasPermission } = usePermission()

  if (!hasPermission(PERMISSIONS.aiChatView)) {
    return navigateTo('/resume')
  }
})
