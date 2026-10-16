import type { BackendIdentity, LoginResult } from '~/types/auth'

/**
 * 鉴权接口。
 *
 * 两个调用点都把 `silent: true` 与 `retry: 0` 打开：
 * - `silent` 是因为登录失败要落到**表单自己的错误区**，不该再飘一个全局 toast；
 * - `retry: 0` 是因为凭据错误重试没有意义，只会让用户多等一轮。
 *
 * 令牌由请求层统一从 cookie 注入（`packages/ui` 的 api 插件），这里不碰鉴权头。
 */
export function createAuthApi() {
  const { $api } = useNuxtApp()

  return {
    login: (input: { account: string; password: string }) =>
      $api<LoginResult>('/auth/login', { method: 'POST', body: input, silent: true, retry: 0 }),

    /** 用 cookie 里的令牌恢复当前身份与权限键 */
    identity: () => $api<BackendIdentity>('/auth/info', { silent: true, retry: 0 }),
  }
}
