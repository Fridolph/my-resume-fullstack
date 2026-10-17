/**
 * 页面级权限守卫（**fail-closed**）。
 *
 * 用法：页面声明需要什么 ——
 *
 * ```ts
 * definePageMeta({
 *   middleware: ['auth', 'permission'],
 *   roles: ['super_admin'],          // 角色（可选；传数组时**任一命中**即满足）
 *   permissions: ['Audit.Log:view'], // 权限键（可选；传数组时要求**全部**满足）
 * })
 * ```
 *
 * ## 为什么必须 fail-closed
 *
 * 旧版本在"没有权限数据"时**放行**（过渡策略，注释写得很坦白）。它的后果不是"少挡了一次"，
 * 而是**所有页面在权限尚未恢复时都是敞开的**：直接敲 URL 就能进。
 * 前端守卫的全部价值就在于"挡直接敲 URL"，failing open 等于没有守卫。
 *
 * ## fail-closed 的两个前提（缺一个就会误伤合法用户）
 *
 * 1. **先恢复会话再判断**：直接打开受保护 URL（SSR 首屏）时 `permissionKeys` 还是空的 ——
 *    这不叫"没权限"，叫"还不知道"。所以有令牌就先 `await hydrate()`
 *    （与 `middleware/auth.ts` 共用同一套恢复逻辑，不重复实现）。
 * 2. **无令牌 ≠ 无权限**：没登录该去登录页，而不是 403。403 表达的是
 *    "你是有效用户，但这个资源不给你"；给未登录用户看 403 会把他卡在原地。
 *
 * ## 为什么 403 用 `throw createError` 而不是 `navigateTo`
 *
 * 状态码是**语义**：403 要让 `app/error.vue` 渲染"无权访问"，
 * 并且在 SSR 阶段就返回 403（`navigateTo` 是先 200 再客户端跳转，curl / 爬虫看到的仍是 200）。
 *
 * ⚠️ 真正的授权在后端。这里只挡"直接敲 URL"，不替代接口层判定。
 */
export default defineNuxtRouteMiddleware(async to => {
  const requiredPermissions = (to.meta.permissions as string[] | undefined) ?? []
  const requiredRoles = (to.meta.roles as string[] | undefined) ?? []

  // 页面没声明任何要求 → 本中间件不管（"有没有登录"由 `auth` 中间件负责）
  if (!requiredPermissions.length && !requiredRoles.length) {
    return
  }

  const { token, isAuthed, session, hydrate } = useAuthState()

  // 有令牌但会话还没恢复（SSR 首屏 / 硬刷新）→ 先恢复，否则会把合法用户误判成无权
  if (!isAuthed.value && token.value) {
    await hydrate()
  }

  // 没登录：去登录页（不是 403 —— 见上面第 2 条）
  if (!isAuthed.value) {
    return navigateTo('/login')
  }

  const roleKeys = session.value?.roleKeys ?? []
  const { hasPermission } = usePermission()

  // 角色：**任一命中**即满足（一个人可以有多个角色）
  const roleSatisfied = !requiredRoles.length || requiredRoles.some(role => roleKeys.includes(role))
  // 权限键：传数组时要求**全部**满足（与该 composable 既有语义一致，不另立一套）
  const permissionSatisfied = !requiredPermissions.length || hasPermission(requiredPermissions)

  if (roleSatisfied && permissionSatisfied) {
    return
  }

  // 把最"具体"的那个要求塞进 statusMessage：`config/error-pages.ts` 会先拿它查共享层的
  // 错误码文案表，查不到才退回状态码文案（例：`Audit.Log:view` 能给出更精确的那句话）
  throw createError({
    statusCode: 403,
    statusMessage: requiredPermissions[0] ?? requiredRoles[0],
    fatal: true,
  })
})
