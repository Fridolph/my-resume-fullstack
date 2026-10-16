/**
 * 启动装配：会话 / 角色 / 语言。
 *
 * **为什么用 plugin 而不是 Provider 组件**（见 `docs/dev/02_身份与权限_设计.md` §3.3）：
 * plugin 在 **SSR 与客户端同一处**执行，两边共享同一套恢复逻辑，避免逻辑分叉；
 * 而 `useState` 本身就是"请求级全局态"（每请求独立 + 自动水合），不需要再包一层 Provider。
 *
 * 在请求插件完成装配后读取 cookie，通过后端恢复身份与权限。
 */
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['api'],
  async setup() {
    const { hydrate, signOut } = useAuthState()
    const { hydrate: hydrateLocale } = useLocale()

    hydrateLocale()
    await hydrate()
    const hook = useNuxtApp().hook as (name: string, callback: () => void) => void
    hook('api:unauthorized', signOut)
  },
})
