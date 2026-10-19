import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, type AuditAction, type AuditResourceType } from '@rs/common'
import type { AuditLogRow } from '../apis/audit'

/**
 * 审计的**展示映射**：动作 → 中文、资源 → 中文、一条记录 → 一句摘要。
 *
 * ## 为什么用 `Record<AuditAction, string>` 而不是普通对象
 *
 * 键集合直接来自共享层的字典，`Record` 要求**每个**动作都有文案 ——
 * 往 `AUDIT_ACTIONS` 加一个动作而忘了在这里补中文，**编译就红**。
 * 这比"页面上露出 `resume.snapshot_restore` 这样的英文常量"要早一步发现。
 *
 * ## 为什么文案不放进 `packages/common`
 *
 * 共享层放"键与规则"，不放"给谁看的字"（`AGENTS.md` §4.6）。
 * web 端将来若要展示审计，它自己长一套文案也说得通。
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AUDIT_ACTIONS.resumeCreate]: '创建简历',
  [AUDIT_ACTIONS.resumeDelete]: '删除简历',
  [AUDIT_ACTIONS.resumeSetDefault]: '设为默认展示',
  [AUDIT_ACTIONS.resumeSetPublished]: '发布 / 取消发布',
  [AUDIT_ACTIONS.userCreate]: '创建账号',
  [AUDIT_ACTIONS.userDelete]: '删除账号',
  [AUDIT_ACTIONS.roleChange]: '变更角色',
}

export const AUDIT_RESOURCE_LABELS: Record<AuditResourceType, string> = {
  [AUDIT_RESOURCE_TYPES.resume]: '简历',
  [AUDIT_RESOURCE_TYPES.user]: '用户',
  [AUDIT_RESOURCE_TYPES.role]: '角色',
}

/** 下拉选项：值用**存进库的稳定标识**，标签才是中文 */
export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))

function text(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number') return String(value)
  return undefined
}

function numberOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/**
 * 把一条审计记录压成一句人能读的话。
 *
 * **穷尽 switch**：新增动作时这里不给分支，TypeScript 会因为返回值可能为 `undefined` 而提示；
 * 兜底返回 `—` 是给"字段缺失"用的，不是给"没写分支"用的。
 *
 * 为什么要摘要而不是直接摊 JSON：审计页的第一眼问题是"**这个人干了什么**"，
 * `{revision: 9, sectionCount: 3, wasDefault: false}` 摆在表格里没人愿意解析。
 */
export function summarizeAudit(row: AuditLogRow): string {
  const meta = row.metadata ?? {}
  const snapshot = row.resourceSnapshot ?? {}

  switch (row.action) {
    case AUDIT_ACTIONS.resumeCreate: {
      const locale = text(meta.locale)
      return locale ? `新建 · locale=${locale}` : '新建'
    }

    case AUDIT_ACTIONS.resumeDelete: {
      const parts: string[] = []
      const name = text(snapshot.name)
      if (name) parts.push(`「${name}」`)
      const revision = numberOf(meta.revision)
      const sectionCount = numberOf(meta.sectionCount)
      if (revision !== undefined) parts.push(`revision ${revision}`)
      if (sectionCount !== undefined) parts.push(`${sectionCount} 个模块`)
      if (typeof meta.wasDefault === 'boolean') parts.push(meta.wasDefault ? '曾是默认' : '非默认')
      return parts.length ? `删除前：${parts.join(' · ')}` : '删除前信息缺失'
    }

    case AUDIT_ACTIONS.resumeSetDefault: {
      const previous = numberOf(meta.previousDefaultId)
      return previous === undefined ? '首个默认（没有顶掉别的）' : `顶掉了 #${previous}`
    }

    case AUDIT_ACTIONS.resumeSetPublished: {
      if (typeof meta.published !== 'boolean') return '—'
      return meta.published ? '已发布（公开可见）' : '已取消发布（不再公开）'
    }

    case AUDIT_ACTIONS.userCreate:
    case AUDIT_ACTIONS.userDelete: {
      const roleKeys = listOf(meta.roleKeys)
      return roleKeys.length ? `角色：${roleKeys.join(', ')}` : '角色未知'
    }

    case AUDIT_ACTIONS.roleChange: {
      const before = listOf(meta.before)
      const after = listOf(meta.after)
      if (!before.length && !after.length) return '—'
      return `${before.join(',') || '无'} → ${after.join(',') || '无'}`
    }

    default:
      // 动作字典新增了、这里却没写分支时才会走到这里
      return '—'
  }
}
