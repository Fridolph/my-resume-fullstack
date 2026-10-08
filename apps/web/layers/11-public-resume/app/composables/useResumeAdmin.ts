/**
 * 管理员会话（**本地 mock**，B 期专用）。
 *
 * ⚠️ 这不是鉴权：账号密码写在前端，任何人在浏览器里都能绕过。
 * 它的唯一作用是先把「登录 → 编辑模式 → 保存」这条交互链路跑通。
 * 接后端 auth 时：把 `signIn` 换成登录请求，`isAdmin` 换成后端返回的角色。
 */
const MOCK_ADMIN = { username: 'admin', password: 'admin' }
const STORAGE_KEY = 'my-resume.admin'

export function useResumeAdmin() {
  const session = useState<{ username: string } | null>('resume-admin-session', () => null)

  const isAdmin = computed(() => Boolean(session.value?.username))

  function signIn(input: { username: string; password: string }) {
    const ok = input.username.trim() === MOCK_ADMIN.username && input.password === MOCK_ADMIN.password

    if (!ok) {
      return { ok: false, message: '账号或密码不正确' }
    }

    session.value = { username: MOCK_ADMIN.username }
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, MOCK_ADMIN.username)
    }

    return { ok: true, message: '' }
  }

  function signOut() {
    session.value = null
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  /** 刷新后恢复登录态（只在客户端调用，避免 SSR / 水合不一致） */
  function restore() {
    if (!import.meta.client) {
      return
    }
    const username = localStorage.getItem(STORAGE_KEY)
    if (username) {
      session.value = { username }
    }
  }

  return { session, isAdmin, signIn, signOut, restore, mockHint: '本地 mock 账号：admin / admin' }
}
