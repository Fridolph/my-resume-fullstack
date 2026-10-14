import { normalizeApiError, resolveApiErrorMessage, TOKEN_COOKIE_KEY } from '@rs/common'
import { createAuthApi } from '~/apis/auth'
import type { BackendIdentity, SessionUser } from '~/types/auth'

/** 从身份派生用户区的展示字段；昵称与邮箱都缺失时给一个中性占位，不显示空标题。 */
function toSessionUser(identity: BackendIdentity): SessionUser {
  const name = identity.nickname?.trim() || identity.email?.split('@')[0] || '未命名用户'

  return {
    name,
    email: identity.email ?? '',
    initials: name.slice(0, 2).toUpperCase(),
  }
}

/**
 * admin 的会话状态：令牌在 cookie、身份在 `useState`、权限键同步进 `usePermission`。
 *
 * **为什么不共用 web 的 `useAuthState`**：那边面向旧客户端的 `oswUserInfo` /
 * `permissionList` 形状，并且已随 DAO-028 验收；上提会让两端一起改、把回归风险
 * 引到已验收的 web 登录链路上。本卡只做 admin 侧最小实现，形状直接对齐后端
 * `/auth/login` 与 `/auth/info`（见 `types/auth.ts`）。两端统一另开迁移卡。
 *
 * **令牌为什么放 cookie 而不是内存**：SSR 阶段要能读到它才能恢复身份（`plugins/auth.ts`），
 * `localStorage` 在服务端不存在。cookie 由请求层统一注入 `Authorization` 头
 * （`packages/ui` 的 api 插件），所以这里只管存取，不拼请求头。
 *
 * `generation` 是**竞态护栏**：登录 / 退出会自增，异步返回后如果代数变了（用户中途退出或
 * 再次登录），结果直接丢弃，避免旧请求把已失效的会话写回去。
 */
export function useAuthState() {
  const api = createAuthApi()
  const { setPermissionKeys } = usePermission()

  const token = useCookie<string | null>(TOKEN_COOKIE_KEY, {
    default: () => null,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
  const session = useState<BackendIdentity | null>('admin-auth-session', () => null)
  const restoring = useState('admin-auth-restoring', () => false)
  const restoreError = useState<string | null>('admin-auth-restore-error', () => null)
  const generation = useState('admin-auth-generation', () => 0)

  const user = computed(() => (session.value ? toSessionUser(session.value) : null))
  const isAuthed = computed(() => session.value !== null)
  /** 编辑类能力的身份层级：角色是"身份层级"，权限键才是"功能授权"，两者在接口侧都要满足 */
  const isEditor = computed(
    () => session.value?.roleKeys.some(role => role === 'admin' || role === 'super_admin') ?? false,
  )

  /** 身份与权限键必须**同时**写入：页面靠 `usePermission` 判断，漏写会出现"已登录但什么都没权限" */
  function applySession(identity: BackendIdentity) {
    session.value = identity
    setPermissionKeys(identity.permissionKeys)
  }

  /** 清空会话：令牌、身份、权限键一起清，避免残留权限让页面以为还能操作 */
  function signOut() {
    generation.value++
    session.value = null
    token.value = null
    restoreError.value = null
    setPermissionKeys([])
  }

  /**
   * 用 cookie 里的令牌恢复身份（刷新、直开链接、SSR 都走这里）。
   *
   * 只在「有令牌且当前无会话」时请求，避免重复打接口；
   * 401 视为令牌已失效，直接退出而不是停在一个"看起来已登录"的空壳状态。
   */
  async function hydrate() {
    if (session.value || !token.value) return

    const expected = generation.value
    restoring.value = true
    restoreError.value = null

    try {
      const identity = await api.identity()
      if (generation.value === expected) applySession(identity)
    } catch (error) {
      if (generation.value !== expected) return
      const normalized = normalizeApiError(error)
      if (normalized.code === 401) signOut()
      else restoreError.value = resolveApiErrorMessage(normalized)
    } finally {
      restoring.value = false
    }
  }

  /**
   * 用用户名或邮箱换令牌。
   *
   * 失败信息**返回给调用方**落在表单里，不在这里 toast —— 登录页需要把
   * 「账号或密码不正确」贴着输入区显示，而不是飘在角落。
   */
  async function signIn(input: { account: string; password: string }) {
    const expected = ++generation.value

    try {
      const result = await api.login(input)
      if (generation.value !== expected) return { ok: false, message: '登录已取消，请重试' }
      token.value = result.token
      applySession(result)
      restoreError.value = null
      return { ok: true, message: '' }
    } catch (error) {
      return { ok: false, message: resolveApiErrorMessage(normalizeApiError(error)) }
    }
  }

  return { token, session, user, isAuthed, isEditor, restoring, restoreError, signIn, signOut, hydrate }
}
