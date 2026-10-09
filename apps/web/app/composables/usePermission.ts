import { PERMISSIONS, rolePermissions } from '~/config/permissions'
import { useAuthState } from './useAuthState'

/**
 * 权限判断 —— **所有权限控制的唯一入口**。
 *
 * 三档语义（见 `config/permissions.ts`）：无 `view` → 不展示；有 `view` 无 `edit` → 展示但不可操作；
 * `view` + `edit` → 完整操作。所以每个能力**成对**导出 `canViewXxx` / `canEditXxx`。
 *
 * 数据来源：后端 `permissionList[].permissionPermitKeys`（`flatMap` 合并多组）；
 * 后端没给（游客 / mock 异常）时回退角色预设 —— **永远非空**，否则判断全是 false、页面整片空。
 */
export function usePermission() {
  const { session, role } = useAuthState()

  const permissionKeys = computed<readonly string[]>(() => {
    const fromBackend = session.value?.permissionList?.flatMap(item => item.permissionPermitKeys ?? []) ?? []

    return fromBackend.length ? fromBackend : rolePermissions(role.value)
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
  const canEditCustomTheme = computed(() => hasPermission(PERMISSIONS.themeCustomEdit))
  const canViewSections = computed(() => hasPermission(PERMISSIONS.sectionsView))
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
    canEditCustomTheme,
    canViewSections,
    canEditSections,
    canResetConfig,
    canViewAiChat,
    canUseAiChat,
    canAccessAdmin,
  }
}
