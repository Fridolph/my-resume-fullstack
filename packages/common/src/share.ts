/**
 * 分享链接的**跨端契约**（server 与 admin 共用）。
 *
 * 为什么放共享层：管理页要渲染这些字段，而服务端产出它们。各写一份的话，
 * 加一个字段时最容易漏改前端 —— 表现为"后台不显示"，且没有任何类型报错。
 */

/** 链接状态。服务端算好，前端不重复实现"撤销优先于过期"那条顺序 */
export type ShareLinkStatus = 'active' | 'expired' | 'revoked'

/** 管理页的一行 */
export interface ShareLinkListItem {
  id: string
  token: string
  /** 备注（"投给 A 公司"）—— 光看 id 分不清用途 */
  label: string | null
  /** 更长的备注，管理页可编辑 */
  note: string | null
  resumeId: number
  resumeName: string
  /** 该简历当前是否仍公开 —— 用于解释"为什么这条链接读不了" */
  resumePublished: boolean
  expiresAt: string
  revokedAt: string | null
  /** `manual` = 作者主动撤销；`unpublished` = 因简历取消发布被批量撤销 */
  revokedReason: string | null
  /** AI 对话轮数配额；`null` = 不开放 */
  aiQuota: number | null
  aiUsed: number
  allowPdf: boolean
  createdAt: string
  lastAccessAt: string | null
  status: ShareLinkStatus
  /** 距离过期的天数（负数 = 已过期）；`null` = 已撤销，不再谈过期 */
  expiresInDays: number | null
}

/** 详情：在列表行上补事件统计 */
export interface ShareLinkDetail extends ShareLinkListItem {
  stats: Array<{ name: string; count: number }>
  totalEvents: number
  recentEvents: Array<{ name: string; action: string; revision: number | null; createdAt: string }>
}
