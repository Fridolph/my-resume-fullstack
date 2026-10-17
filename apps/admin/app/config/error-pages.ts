import { API_ERROR_CODE_MESSAGES, API_ERROR_MESSAGES, UNKNOWN_ERROR_MESSAGE } from '@rs/common'

/**
 * 错误页的**文案配置**（`app/error.vue` 只负责渲染与动作）。
 *
 * ## 为什么按 `statusCode` 而不是按 `errorCode` 分支
 *
 * 状态码决定"这页要表达哪一类事"（没登录 / 没权限 / 不存在 / 坏了），
 * 这是**动作不同**的来源（去登录 / 回首页 / 重试）；
 * 而 `errorCode` 只决定"具体是哪句话"—— 它是描述层，不是分类层。
 *
 * ## 为什么还要接 `errorCode`
 *
 * 后端返回的 `errorCode`（如 `Audit.Log:view`）比 403 更有信息量。
 * 约定：**路由守卫 / 请求层把 errorCode 塞进 `statusMessage`**，
 * 这里先用共享层 `API_ERROR_CODE_MESSAGES` 解析成中文，解析不到才退回状态码文案。
 *
 * 顺序是刻意的：**具体的错误码文案 > 粗略的状态码文案 > 兜底**。
 * 反过来会让"没有权限查阅审计"被压成"没有权限执行该操作"，丢掉最有用的那一句。
 */

export type ErrorPageKind = 'unauthorized' | 'forbidden' | 'not-found' | 'unknown'

/** 主按钮的三种去向；`retry` 需要重新进入当前地址，所以只表达意图、由页面执行 */
export type ErrorPageAction = 'login' | 'home' | 'retry'

export interface ErrorPageConfig {
  kind: ErrorPageKind
  /** 顶部的状态码徽标，如 `403` */
  badge: string
  icon: string
  title: string
  description: string
  /** 一句话补充；没有就不显示 */
  hint?: string
  primaryLabel: string
  primaryAction: ErrorPageAction
}

/**
 * 业务错误码 → 文案。
 *
 * 只读共享层那张表，**不在这里另抄一份**：那张表的键是后端契约的一部分，
 * 抄一份必然漂移（改了后端码、错误页还在说旧话）。
 */
function descriptionFromCode(code: string | undefined): string | undefined {
  if (!code) return undefined
  return API_ERROR_CODE_MESSAGES[code]
}

/**
 * 由状态码 + 错误码解析出整页配置。
 *
 * @param statusCode HTTP 状态码；`undefined` 表示不是 HTTP 错误（如客户端抛错）
 * @param statusMessage 约定用于携带 `errorCode`
 */
export function resolveErrorPage(statusCode: number | undefined, statusMessage: string | undefined): ErrorPageConfig {
  const byCode = descriptionFromCode(statusMessage)

  // 401 / 403 的差别不是程度，而是**要不要换个身份**：
  // 401 = 当前身份无效（该去登录）；403 = 身份有效但不够格（去登录没用，只能回去）
  if (statusCode === 401) {
    return {
      kind: 'unauthorized',
      badge: '401',
      icon: 'i-lucide-log-in',
      title: '需要先登录',
      description: byCode ?? API_ERROR_MESSAGES[401] ?? UNKNOWN_ERROR_MESSAGE,
      primaryLabel: '去登录',
      primaryAction: 'login',
    }
  }

  if (statusCode === 403) {
    return {
      kind: 'forbidden',
      badge: '403',
      icon: 'i-lucide-shield-off',
      title: '无权访问',
      description: byCode ?? API_ERROR_MESSAGES[403] ?? UNKNOWN_ERROR_MESSAGE,
      // Owner 2026-10-16 的口径：403 页**只做告知**，不给"切换账号"。
      // 它要回答的是"这个功能存在、但你现在进不去"，而不是替用户做登录决策。
      hint: '该功能仅对超级管理员开放。如需使用，请由超级管理员操作。',
      primaryLabel: '返回首页',
      primaryAction: 'home',
    }
  }

  if (statusCode === 404) {
    return {
      kind: 'not-found',
      badge: '404',
      icon: 'i-lucide-compass',
      title: '页面不存在',
      description: byCode ?? API_ERROR_MESSAGES[404] ?? UNKNOWN_ERROR_MESSAGE,
      hint: '地址可能已经变更，或者这个页面还没有做。',
      primaryLabel: '返回首页',
      primaryAction: 'home',
    }
  }

  return {
    kind: 'unknown',
    badge: statusCode ? String(statusCode) : 'ERROR',
    icon: 'i-lucide-circle-alert',
    title: '出了点问题',
    description: byCode ?? (statusCode ? API_ERROR_MESSAGES[statusCode] : undefined) ?? UNKNOWN_ERROR_MESSAGE,
    hint: '如果反复出现，请查看后端日志（请求 id 在响应头里）。',
    primaryLabel: '重试',
    primaryAction: 'retry',
  }
}
