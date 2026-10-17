import { API_ERROR_CODE_MESSAGES, API_ERROR_MESSAGES, UNKNOWN_ERROR_MESSAGE } from '../api/constants.js'

/**
 * 错误页的**分类与文案**（两端共用：web 与 admin）。
 *
 * ## 为什么放共享层
 *
 * 这里只有"状态码 → 该说什么、该给哪个动作"的纯判断，**不碰 Vue、不碰导航**，
 * 满足 `AGENTS.md` §4.6 的判据（能脱离框架运行）。
 * 两端各写一份必然漂移：一边把 404 说成"页面不存在"、另一边说"找不到资源"，
 * 用户会以为遇到了两种不同的问题。
 *
 * ## 为什么按 `statusCode` 分类、按 `errorCode` 描述
 *
 * - **状态码决定动作**：401 要换身份（去登录）、403 换身份没用（回首页）、5xx 可以重试 —— 动作不同，分类就得在状态码上。
 * - **`errorCode` 决定用哪句话**：`Audit.Log:view` 比 403 有信息量得多。
 *
 * 解析顺序是 **errorCode 文案 > 状态码文案 > 兜底**。反过来会把"没有权限查阅审计"
 * 压成"没有权限执行该操作"，丢掉最有用的一句。
 *
 * ## 约定：`errorCode` 从 `statusMessage` 传进来
 *
 * Nuxt 的 `createError({ statusCode, statusMessage })` 只有这两个字段能跨服务端/客户端携带，
 * 所以路由守卫与请求层把**后端的 `errorCode` 塞进 `statusMessage`**。
 */

export type ErrorPageKind = 'unauthorized' | 'forbidden' | 'not-found' | 'unknown'

/** 主按钮的三种去向；`retry` 要重新进入当前地址，由宿主执行 */
export type ErrorPageAction = 'login' | 'home' | 'retry'

export interface ErrorPageConfig {
  kind: ErrorPageKind
  /** 顶部徽标，如 `403` */
  badge: string
  /** Nuxt UI 的图标名 */
  icon: string
  title: string
  description: string
  /** 一句话补充；没有就不显示 */
  hint?: string
  primaryLabel: string
  primaryAction: ErrorPageAction
}

/** 只读共享层那张错误码表，不在别处另抄一份（抄必漂移） */
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
  // 401 = 当前身份无效（该去登录）；403 = 身份有效但不够格（去登录没用）
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
      // Owner 2026-10-16：403 页**只做告知**，不给"切换账号"。
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
    hint: '如果反复出现，请查看后端日志（响应头里有请求 id）。',
    primaryLabel: '重试',
    primaryAction: 'retry',
  }
}
