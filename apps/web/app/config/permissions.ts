/**
 * 角色与权限键（web 端）。
 *
 * 设计见 `docs/dev/identity-and-access.md` §2：
 *
 * - 组件里**只判断权限键**（`hasPermission(PERMISSIONS.sectionsEdit)`），**不判断角色**；
 * - 权限键**成对**：`XX:view` 决定"能不能看到"，`XX:edit` 决定"能不能操作"。
 *   三档语义（Owner 2026-10-09 定）：
 *
 *   | 持有            | 表现                     |
 *   | --------------- | ------------------------ |
 *   | 无 `view`       | **不展示**（`v-if`）      |
 *   | 有 `view` 无 `edit` | **展示但不可操作**（`disabled`） |
 *   | `view` + `edit` | 完整操作（admin）         |
 *
 * - 命名对齐后端（`域.资源:动作`）：后端 `permissionPermitKeys` 可以直接喂进来判断，
 *   **不需要映射表**；真实键名以后端契约定稿为准（改键名 = 改这一个文件）；
 * - 纯 TS、无 Vue 运行时依赖：P1 若 admin 也要用，可整体迁到 `packages/common`。
 */

export type Role = 'guest' | 'user' | 'admin'

/** 权限键常量（动作沿用后端动词集 view / create / edit / delete） */
export const PERMISSIONS = {
  /** 浏览公开简历 */
  resumeView: 'Resume.Profile:view',
  /** 能看到「布局与风格」 */
  displayView: 'Resume.Display:view',
  /** 能改布局与风格 */
  displayEdit: 'Resume.Display:edit',
  /** 能看到「主题与背景」 */
  themeView: 'Resume.Theme:view',
  /** 能改主题与背景（预设 / 明暗 / 背景类型） */
  themeEdit: 'Resume.Theme:edit',
  /** 能看到「自定义调色盘」 */
  themeCustomView: 'Resume.ThemeCustom:view',
  /** 能用「自定义调色盘」—— 比"切换预设"高一档，所以单独成对 */
  themeCustomEdit: 'Resume.ThemeCustom:edit',
  /** 能看到「区块显隐」 */
  sectionsView: 'Resume.Sections:view',
  /** 能改区块显隐 + 拖拽编辑简历模块 */
  sectionsEdit: 'Resume.Sections:edit',
  /** 重置全部配置与内容（危险操作） */
  configDelete: 'Resume.Config:delete',
  /** 发布快照（将来） */
  snapshotCreate: 'Resume.Snapshot:create',
  /** 能看到 AI 对话入口 */
  aiChatView: 'AiTalk.Chat:view',
  /** 能发起 AI 对话 */
  aiChatCreate: 'AiTalk.Chat:create',
  /** 进入 admin 端（路由守卫用） */
  adminConsole: 'Admin.Console:view',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const DEFAULT_ROLE: Role = 'guest'

/**
 * 公开站的基础能力（游客即可）：
 * 「自定义调色盘」与「区块显隐」**只给 view**——于是它们会展示出来但控件不可操作，
 * 这正好是"让游客看见价值、但改不了"的那一档。
 */
const PUBLIC_DISPLAY_KEYS: readonly PermissionKey[] = [
  PERMISSIONS.resumeView,
  PERMISSIONS.displayView,
  PERMISSIONS.displayEdit,
  PERMISSIONS.themeView,
  PERMISSIONS.themeEdit,
  PERMISSIONS.themeCustomView,
  PERMISSIONS.sectionsView,
]

/** 角色 → 权限键的预设（**后端 permissionList 缺失时的兜底**，绝不返回空集） */
export const ROLE_PERMISSIONS: Record<Role, readonly PermissionKey[]> = {
  guest: [...PUBLIC_DISPLAY_KEYS],
  user: [...PUBLIC_DISPLAY_KEYS, PERMISSIONS.aiChatView, PERMISSIONS.aiChatCreate],
  admin: [
    ...PUBLIC_DISPLAY_KEYS,
    PERMISSIONS.themeCustomEdit,
    PERMISSIONS.sectionsEdit,
    PERMISSIONS.configDelete,
    PERMISSIONS.snapshotCreate,
    PERMISSIONS.aiChatView,
    PERMISSIONS.aiChatCreate,
    PERMISSIONS.adminConsole,
  ],
}

/** 取某角色的预设权限键（未知角色按 guest 处理，**绝不返回空集**） */
export function rolePermissions(role: Role): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS[DEFAULT_ROLE]
}

/** 后端的 `roleCode` → 前端 `Role`（认不出就当普通用户，不静默升权） */
export function roleFromCode(roleCode: string | undefined): Role {
  if (roleCode === 'admin') {
    return 'admin'
  }

  if (roleCode) {
    return 'user'
  }

  return DEFAULT_ROLE
}
