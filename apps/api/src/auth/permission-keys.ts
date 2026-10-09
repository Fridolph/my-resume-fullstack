/**
 * 权限键 —— **后端侧的唯一定义源**。
 *
 * ## 规范
 *
 * `<域>.<资源>:<动作>`，域与前端 `layers/` 的业务域名同名（见
 * `docs/dev/02_身份与权限_设计.md` §2.1），动作取后端动词集 `view` / `create` / `edit` / `delete`。
 * 好处是前端拿到的键可以**直接用来判断**，不需要一张映射表 —— 而映射表正是最容易过期的东西。
 *
 * ## 为什么键名写在代码里，而不是只存在数据库
 *
 * `Permission` 表要存"谁拥有它"这层**关系**，但**键名本身**待在代码里更好：
 * 能进类型系统、能被前端镜像、能在 PR 里 diff 出来；而"库里有哪些键"没人说得清
 * —— 那又会退化成参考项目那种"多份真源"的局面。
 * 所以：**代码定义键 → seed 同步进 `permissions` 表 → 库里只维护关联**。
 *
 * ⚠️ 与前端 `apps/web/app/config/permissions.ts` 是**镜像关系**（同一规范、两处声明）。
 * 理想做法是放进 `packages/common` 共享，但那边是 ESM 而 API 编译为 CJS，
 * 等真要共享时一并解决模块格式（这条判断已记在 `docs/server/01_API_约定.md` §6.1）。
 */
export const PERMISSION_KEYS = {
  /** 浏览公开简历（所有角色都有） */
  RESUME_PROFILE_VIEW: 'Resume.Profile:view',
  /** 切换展示设置（布局 / 风格 / 主题 / 背景） */
  RESUME_DISPLAY_EDIT: 'Resume.Display:edit',
  /** 发起 AI 对话 */
  AI_TALK_CHAT_CREATE: 'AiTalk.Chat:create',
  /** 区块拖拽 / 内容编辑 */
  RESUME_SECTIONS_EDIT: 'Resume.Sections:edit',
  /** 重置全部配置与内容 */
  RESUME_CONFIG_DELETE: 'Resume.Config:delete',
  /** 发布快照（将来） */
  RESUME_SNAPSHOT_CREATE: 'Resume.Snapshot:create',
  /** 进入 admin 端（路由守卫用） */
  ADMIN_CONSOLE_VIEW: 'Admin.Console:view',

  // ── 用户管理（本轮新增：没有这几个键，"谁能管理用户"就无从判断）──
  SETTINGS_USERS_VIEW: 'Settings.Users:view',
  SETTINGS_USERS_CREATE: 'Settings.Users:create',
  SETTINGS_USERS_EDIT: 'Settings.Users:edit',
  SETTINGS_USERS_DELETE: 'Settings.Users:delete',
} as const

export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS]

/** 所有权限键的列表（seed 用；顺序稳定，便于 diff） */
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = Object.values(PERMISSION_KEYS)

/**
 * 角色的权限预设 —— **role 表里的 `key` 与这里必须一致**（seed 会校验）。
 *
 * 注意这**不是**运行时判断依据：运行时判断只看"当前用户有哪些权限键"
 * （登录时由 `user_roles → role_permissions → permissions` 聚合而来）。
 * 这里存在的意义是"新库初始化时，每个角色默认拥有什么"，也就是 seed 的输入。
 */
export const ROLE_PERMISSION_PRESETS = {
  user: [PERMISSION_KEYS.RESUME_PROFILE_VIEW, PERMISSION_KEYS.RESUME_DISPLAY_EDIT, PERMISSION_KEYS.AI_TALK_CHAT_CREATE],
  admin: ALL_PERMISSION_KEYS,
} as const

export type RoleKey = keyof typeof ROLE_PERMISSION_PRESETS
