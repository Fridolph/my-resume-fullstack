import { PERMISSIONS, rolePermissions } from '~/config/permissions'
import { useAuthState } from './useAuthState'

/**
 * 权限判断 —— **所有权限控制的唯一入口**。
 *
 * 三档语义（见 `config/permissions.ts`）：无 `view` → 不展示；有 `view` 无 `edit` → 展示但不可操作；
 * `view` + `edit` → 完整操作。所以每个能力**成对**导出 `canViewXxx` / `canEditXxx`。
 *
 * 数据来源：后端 `permissionList[].permissionPermitKeys`（`flatMap` 合并多组）；
 * 登录身份仅使用后端权限并叠加游客浏览能力，空权限不会提升为角色预设。
 */
export function usePermission() {
  const { session, role } = useAuthState()

  const permissionKeys = computed<readonly string[]>(() => {
    /**
     * ⚠️ **优先读 `permissionKeys`**：那是后端 `/auth/info` 真正返回的字段
     *（`{ roleKeys, permissionKeys }`）。`permissionList[].permissionPermitKeys` 是旧客户端的
     * 形状，后端**从不返回** —— 只读它的话，`fromBackend` 恒为空，
     * 于是 `canEditSections` 等判断永远为 false。
     *
     * 症状：公开页的就地编辑对**任何身份**都不可用（编辑开关不出现、改了也不保存），
     * 而页面上没有任何报错 —— 看起来像"保存坏了"。
     * 旧形状保留为兜底，等旧客户端彻底下线再删。
     */
    const legacy = session.value?.permissionList?.flatMap(item => item.permissionPermitKeys ?? []) ?? []
    const fromBackend = session.value?.permissionKeys?.length ? session.value.permissionKeys : legacy

    return session.value ? [...new Set([...rolePermissions('guest'), ...fromBackend])] : rolePermissions(role.value)
  })

  /**
   * 明确禁止的接口路径（后端 `permissionForbidPaths`）。
   *
   * 两种用法：**隐藏入口**（连入口都不给）、**能进但操作被拒**（入口照常，调用被禁接口时提示无权限）。
   * 本轮只提供查询能力，拦截逻辑随后续需求再加。
   */
  const forbiddenPaths = computed(
    () => session.value?.permissionList?.flatMap(item => item.permissionForbidPaths ?? []) ?? [],
  )

  /** 传数组 = **全部**满足（AND）；与 `apps/admin/app/composables/usePermission.ts` 语义一致 */
  function hasPermission(keys: string | string[]) {
    if (Array.isArray(keys)) {
      return keys.every(key => permissionKeys.value.includes(key))
    }

    return permissionKeys.value.includes(keys)
  }

  /** **任一**满足（OR）—— 别改上面的 AND 语义（会静默改变 admin 端行为） */
  function hasAnyPermission(keys: string[]) {
    return keys.some(key => permissionKeys.value.includes(key))
  }

  /** 某个接口路径是否被明确禁止（含子路径） */
  function isPathForbidden(path: string) {
    return forbiddenPaths.value.some(item => path === item || path.startsWith(`${item}/`))
  }

  // ── 语义化便捷判断 ───────────────────────────────────────────────
  // 页面 / 组件用这些，不把权限键字符串散落到各处（键名是"与后端的契约"，只在 config 里维护）。
  const canViewDisplay = computed(() => hasPermission(PERMISSIONS.displayView))
  const canEditDisplay = computed(() => hasPermission(PERMISSIONS.displayEdit))
  const canViewTheme = computed(() => hasPermission(PERMISSIONS.themeView))
  const canEditTheme = computed(() => hasPermission(PERMISSIONS.themeEdit))
  const canViewCustomTheme = computed(() => hasPermission(PERMISSIONS.themeCustomView))
  /** 第三档：能点但可能被拒（`edit` 隐含 `interact`） */
  const canInteractCustomTheme = computed(() =>
    hasAnyPermission([PERMISSIONS.themeCustomInteract, PERMISSIONS.themeCustomEdit]),
  )
  const canEditCustomTheme = computed(() => hasPermission(PERMISSIONS.themeCustomEdit))
  const canViewSections = computed(() => hasPermission(PERMISSIONS.sectionsView))
  /** 第三档：能点但可能被拒（`edit` 隐含 `interact`） */
  const canInteractSections = computed(() => hasAnyPermission([PERMISSIONS.sectionsInteract, PERMISSIONS.sectionsEdit]))
  const canEditSections = computed(() => hasPermission(PERMISSIONS.sectionsEdit))
  const canResetConfig = computed(() => hasPermission(PERMISSIONS.configDelete))
  const canViewAiChat = computed(() => hasPermission(PERMISSIONS.aiChatView))
  const canUseAiChat = computed(() => hasPermission(PERMISSIONS.aiChatCreate))
  const canAccessAdmin = computed(() => hasPermission(PERMISSIONS.adminConsole))

  return {
    permissionKeys,
    forbiddenPaths,
    hasPermission,
    hasAnyPermission,
    isPathForbidden,
    canViewDisplay,
    canEditDisplay,
    canViewTheme,
    canEditTheme,
    canViewCustomTheme,
    canInteractCustomTheme,
    canEditCustomTheme,
    canViewSections,
    canInteractSections,
    canEditSections,
    canResetConfig,
    canViewAiChat,
    canUseAiChat,
    canAccessAdmin,
  }
}
