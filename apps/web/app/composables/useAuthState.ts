import { normalizeApiError, resolveApiErrorMessage, TOKEN_COOKIE_KEY } from '@rs/common'
import type { AuthSessionData, BackendIdentity } from '~/types/auth'
import type { Role } from '~/config/permissions'
import { roleFromCode } from '~/config/permissions'
import { createAuthApi } from '~/apis/auth'

function toSession(identity: BackendIdentity): AuthSessionData {
  return {
    token: '',
    oswUserInfo: { id: identity.userId, email: identity.email ?? '', firstName: identity.nickname ?? '', lastName: '' },
    permissionList: identity.roleKeys.map((roleCode, index) => ({
      id: index,
      roleName: roleCode,
      roleCode,
      permissionPermitKeys: identity.permissionKeys,
    })),
  }
}

export function useAuthState() {
  const api = createAuthApi()
  const token = useCookie<string | null>(TOKEN_COOKIE_KEY, {
    default: () => null,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
  const session = useState<AuthSessionData | null>('auth-session', () => null)
  const restoring = useState('auth-restoring', () => false)
  const restoreError = useState<string | null>('auth-restore-error', () => null)
  const generation = useState('auth-generation', () => 0)
  const role = computed<Role>(() => {
    if (!session.value) return 'guest'
    const roles = session.value.permissionList.map(item => item.roleCode)
    return roleFromCode(roles.includes('super_admin') ? 'super_admin' : roles.includes('admin') ? 'admin' : roles[0])
  })
  const user = computed(() => session.value?.oswUserInfo ?? null)
  const isAuthed = computed(() => session.value !== null)
  const isAdmin = computed(() => role.value === 'admin')

  function signOut() {
    generation.value++
    session.value = null
    token.value = null
    restoreError.value = null
  }

  async function hydrate() {
    if (session.value || !token.value) return
    if (token.value.startsWith('mock-token-')) {
      signOut()
      return
    }
    const expected = generation.value
    restoring.value = true
    restoreError.value = null
    try {
      const identity = await api.identity()
      if (generation.value === expected) session.value = toSession(identity)
    } catch (error) {
      if (generation.value !== expected) return
      const normalized = normalizeApiError(error)
      if (normalized.code === 401) signOut()
      else restoreError.value = resolveApiErrorMessage(normalized)
    } finally {
      restoring.value = false
    }
  }

  async function signIn(input: { username: string; password: string }) {
    const expected = ++generation.value
    try {
      const result = await api.login({ account: input.username, password: input.password })
      if (generation.value !== expected) return { ok: false, message: '登录已取消，请重试' }
      token.value = result.token
      session.value = toSession(result)
      restoreError.value = null
      return { ok: true, message: '' }
    } catch (error) {
      return { ok: false, message: resolveApiErrorMessage(normalizeApiError(error)) }
    }
  }

  return { token, session, role, user, isAuthed, isAdmin, restoring, restoreError, signIn, signOut, hydrate }
}
