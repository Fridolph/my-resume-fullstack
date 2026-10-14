/**
 * 启动装配：从 cookie 恢复会话。
 *
 * **为什么用 plugin 而不是在页面里各写一次**：plugin 在 **SSR 与客户端同一处**执行，
 * 两边共享同一套恢复逻辑，避免"服务端不认会话、客户端又认"的分叉；`useState` 本身
 * 是请求级全局态（每请求独立 + 自动水合），不需要再包一层 Provider —— 与 web 的做法一致。
 *
 * `dependsOn: ['api']` 是必需的：恢复身份要发请求，必须在请求层（`packages/ui` 的 api 插件）
 * 装好之后执行。`api:unauthorized` 钩子把"令牌失效"接回 `signOut`，让 401 有唯一出口。
 */
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['api'],
  async setup() {
    const { hydrate, signOut } = useAuthState()

    await hydrate()

    const hook = useNuxtApp().hook as (name: string, callback: () => void) => void
    hook('api:unauthorized', signOut)
  },
})
