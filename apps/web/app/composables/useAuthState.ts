import type { AuthSessionData } from '~/types/auth'
import type { Role } from '~/config/permissions'
import { DEFAULT_ROLE, roleFromCode } from '~/config/permissions'
import { accountFromToken, MOCK_ACCOUNT_HINT, mockAuthResponse, verifyMockAccount } from '~/mock/auth'
import { TOKEN_COOKIE_KEY } from '~/utils/requestContext'

/**
 * 会话与角色。
 *
 * 三个关键决定（见 `docs/dev/identity-and-access.md` §2.3 / §3.2）：
 *
 * 1. **持久化用 cookie**（`my-resume.token`，与请求层 `$request` 注入 `Authorization` 是同一个键）
 *    —— cookie 在 SSR 阶段就能读到，首屏直出真实身份，从根上消除"水合后跳一下"。
 * 2. **共享状态用 `useState`**：每次调用返回同一个 ref。若每个组件各自 `useCookie()`，
 *    会拿到互不同步的 ref（A 组件改了 B 组件不知道）。
 * 3. **`role` 从会话派生**，不单独存 —— 避免出现"token 与角色不一致"的状态。
 *
 * ⚠️ 这仍然不是鉴权：账号写在前端，改 cookie 即可绕过。真实鉴权在 P2 的后端 auth。
 */

/** 上一版过渡实现（把角色直接写进 cookie）—— 只为迁移保留 */
const LEGACY_ROLE_COOKIE = 'my-resume.role'

/** 更早的 localStorage 键 —— 只为迁移保留 */
const LEGACY_ADMIN_KEY = 'my-resume.admin'

export function useAuthState() {
  const token = useCookie<string | null>(TOKEN_COOKIE_KEY, {
    default: () => null,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })

  const session = useState<AuthSessionData | null>('auth-session', () => null)

  const legacyRoleCookie = useCookie<Role | null>(LEGACY_ROLE_COOKIE, { default: () => null })

  /** 角色由会话派生：没有会话 = 游客；有会话则看 `permissionList[0].roleCode` */
  const role = computed<Role>(() => {
    if (!session.value) {
      return DEFAULT_ROLE
    }

    return roleFromCode(session.value.permissionList?.[0]?.roleCode)
  })

  const user = computed(() => session.value?.oswUserInfo ?? null)
  const isAuthed = computed(() => Boolean(session.value))
  const isAdmin = computed(() => role.value === 'admin')

  /** 会话与 token 一起写，避免两者脱节 */
  function applySession(next: AuthSessionData | null) {
    session.value = next
    token.value = next?.token ?? null
  }

  /**
   * 从 token 恢复会话（plugin 启动时调用，幂等）。
   *
   * mock 阶段：token 本身就带账号（`mock-token-admin`）。
   * P2 接后端时改成"拿 token 请求 session 接口" —— **只有这个函数要改**。
   */
  function hydrate() {
    if (session.value) {
      return
    }

    const account = accountFromToken(token.value)
    if (!account) {
      return
    }

    applySession(mockAuthResponse(account).data)
  }

  /** 一个登录口，按账号区分身份（admin → 管理权限；user → 普通用户） */
  function signIn(input: { username: string; password: string }) {
    const account = verifyMockAccount(input.username, input.password)

    if (!account) {
      return { ok: false, message: '账号或密码不正确' }
    }

    applySession(mockAuthResponse(account).data)

    return { ok: true, message: '' }
  }

  function signOut() {
    applySession(null)
  }

  /** 迁移旧会话（两个历史版本），避免老会话刷新后掉登录态 */
  function migrateLegacySession() {
    if (import.meta.client) {
      const legacy = localStorage.getItem(LEGACY_ADMIN_KEY)
      if (legacy) {
        localStorage.removeItem(LEGACY_ADMIN_KEY)
        applySession(mockAuthResponse('admin').data)
        return
      }
    }

    const legacyRole = legacyRoleCookie.value
    if (legacyRole) {
      legacyRoleCookie.value = null
      if (legacyRole === 'admin') {
        applySession(mockAuthResponse('admin').data)
      } else if (legacyRole === 'user') {
        applySession(mockAuthResponse('user').data)
      }
    }
  }

  return {
    token,
    session,
    role,
    user,
    isAuthed,
    isAdmin,
    signIn,
    signOut,
    hydrate,
    migrateLegacySession,
    mockHint: MOCK_ACCOUNT_HINT,
  }
}
