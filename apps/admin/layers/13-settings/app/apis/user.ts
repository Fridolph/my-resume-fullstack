/** 本人资料的形状（服务端 `SAFE_USER_SELECT` 的投影，永远不含 passwordHash） */
export interface MyProfile {
  id: string
  username: string | null
  nickname: string | null
  email: string | null
  phone: string | null
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export type ProfileUpdateInput = Partial<Pick<MyProfile, 'username' | 'nickname' | 'email' | 'phone' | 'avatar'>>

/**
 * 本人资料接口。
 *
 * 用 `/user/me` 而不是 `/user/:id`：后者是**管理**接口（要用户管理权限），
 * 而"看/改自己的资料"是每个登录用户的权利。两者的授权面不同，不该共用入口。
 */
export function createUserApi() {
  const { $api } = useNuxtApp()
  return {
    getMe: () => $api<MyProfile>('/user/me', { silent: true, retry: 0 }),
    updateMe: (input: ProfileUpdateInput) =>
      $api<MyProfile>('/user/me', { method: 'PATCH', body: input, silent: true, retry: 0 }),
  }
}
