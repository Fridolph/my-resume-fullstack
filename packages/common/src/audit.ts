/**
 * 审计的动作字典、资源类型与 `metadata` 白名单（**共享层**）。
 *
 * ## 为什么放在 `packages/common`
 *
 * 三端都要用同一份：
 * - `apps/server` 写审计时需要**动作标识**与**白名单校验**；
 * - `apps/admin` 将来渲染审计列表时需要把 `resume.delete` 显示成"删除了简历"——
 *   两处各写一份映射，必然漂移（一处加了动作、另一处不认识，页面上就露出英文常量）。
 *
 * 它满足 `AGENTS.md` §4.6 的判据：能脱离 Vue/Nuxt 运行（纯常量 + 纯函数）。
 *
 * ## 为什么 `metadata` 用白名单而不是黑名单
 *
 * 判据：**黑名单会漏，白名单会缺；审计场景里"缺"可接受，"漏"不可接受。**
 *
 * 黑名单要求"列举所有不该记的东西"——而简历的字段会不断新增（今天加个"期望薪资"，
 * 明天加个"证件号"），没人会记得回来补黑名单，于是泄漏是**静默发生**的。
 * 白名单反过来：新增字段默认**不记**，想记必须显式加进来，最坏情况只是"少记了一个字段"。
 *
 * 光有清单还不够：`pickAuditMetadata` 是**唯一的强制执行点** ——
 * 写入前先过它，白名单之外的一律丢弃，让保证是机械的而不是靠人记得。
 */

/** 审计动作字典。键是语义名，值是**存进数据库的稳定标识**（不要为了好看改它） */
export const AUDIT_ACTIONS = {
  /** 创建简历 */
  resumeCreate: 'resume.create',
  /** 删除简历（**不可逆**，强一致） */
  resumeDelete: 'resume.delete',
  /** 设为 / 取消默认展示（会取消别人的默认标记，属可追责的状态变更） */
  resumeSetDefault: 'resume.set_default',
  /** 创建账号 */
  userCreate: 'user.create',
  /** 删除账号 */
  userDelete: 'user.delete',
  /** 角色 / 权限变更 */
  roleChange: 'role.change',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

/** 资源类型字典。决定 `resourceId` 怎么解释 */
export const AUDIT_RESOURCE_TYPES = {
  resume: 'resume',
  user: 'user',
  role: 'role',
} as const

export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[keyof typeof AUDIT_RESOURCE_TYPES]

/**
 * 每个动作允许写入 `metadata` 的字段白名单。
 *
 * ⚠️ 这些字段名是**业务侧约定的**，共享层不认接口 —— 它只做"允许哪些键通过"的机械校验。
 *
 * 设计意图：让"删除简历"能回答**它删掉的是不是一份已完成的简历** ——
 * 只看 `resourceId` 没有办法判断，而这两个字段不含任何 PII。
 */
export const AUDIT_METADATA_WHITELIST: Record<AuditAction, readonly string[]> = {
  [AUDIT_ACTIONS.resumeCreate]: ['locale'],
  [AUDIT_ACTIONS.resumeDelete]: ['revision', 'sectionCount', 'wasDefault'],
  [AUDIT_ACTIONS.resumeSetDefault]: ['previousDefaultId'],
  [AUDIT_ACTIONS.userCreate]: ['roleKeys'],
  [AUDIT_ACTIONS.userDelete]: ['roleKeys'],
  [AUDIT_ACTIONS.roleChange]: ['before', 'after'],
}

/**
 * 按白名单裁剪 `metadata`（**唯一强制执行点**）。
 *
 * 返回 `undefined` 而不是空对象：没有可记内容时，数据库里就该是 `NULL`，
 * 而不是一个 `{}` —— 后者会让"这个动作本来就没有额外信息"与"有信息但被裁光了"看起来一样。
 *
 * @param action 动作标识，决定用哪份白名单
 * @param metadata 调用方想记录的信息（可能是任意形状）
 * @returns 只含白名单字段的对象；一个都没有时返回 `undefined`
 */
export function pickAuditMetadata(
  action: AuditAction,
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined

  const allowed = AUDIT_METADATA_WHITELIST[action]
  const picked: Record<string, unknown> = {}
  for (const key of allowed) {
    if (metadata[key] !== undefined) picked[key] = metadata[key]
  }

  return Object.keys(picked).length > 0 ? picked : undefined
}
