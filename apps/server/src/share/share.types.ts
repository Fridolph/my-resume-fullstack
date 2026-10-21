/**
 * 分享链接的**有效期解析**（纯函数，便于单测）。
 *
 * ## 为什么"有效期"不直接让客户端传一个时间戳
 *
 * 让客户端传 `expiresAt` 意味着**上限要靠服务端事后校验**，而校验一旦漏了就变成
 * "可以建一条十年有效的链接"。这里让客户端只传**选项**（或自定义天数），
 * 时间戳一律由服务端算 —— 上限是**结构性**的，不是校验出来的。
 */
export const SHARE_EXPIRY_OPTIONS = ['today', '3d', '7d', '30d', 'custom'] as const
export type ShareExpiryOption = (typeof SHARE_EXPIRY_OPTIONS)[number]

/** 默认 3 天：找工作期间会频繁改简历，3 天是个合适的窗口（Owner 2026-10-19） */
export const SHARE_DEFAULT_EXPIRY: ShareExpiryOption = '3d'

/** 有效期上限：再长没有必要，而且会放大泄露面 */
export const SHARE_MAX_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

/** 各选项对应的天数（`today` 与 `custom` 单独算） */
const OPTION_DAYS: Record<Exclude<ShareExpiryOption, 'today' | 'custom'>, number> = {
  '3d': 3,
  '7d': 7,
  '30d': 30,
}

export interface ShareExpiryResult {
  expiresAt: Date
  /** 实际天数，便于返回给前端显示"有效期 N 天" */
  days: number
}

/**
 * 解析有效期选项为具体的到期时间。
 *
 * - `today`：到**当天 23:59:59.999（UTC）** —— 与 `publishedAt` 等日期字段的 UTC 口径一致；
 *   用本地时区会导致同一份配置在不同机器上到期时间不同。
 * - 其余：`now + N 天`
 *
 * @returns 到期时间与实际天数；**超过上限返回 `null`**（由调用方转成 400，
 *          不在这里抛异常 —— 纯函数不该决定 HTTP 语义）
 */
export function resolveShareExpiry(
  option: ShareExpiryOption,
  customDays: number | undefined,
  now: Date = new Date(),
): ShareExpiryResult | null {
  if (option === 'today') {
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
    // "当天内"在极晚创建时可能只剩几毫秒 —— 仍视为合法，但天数按 1 记（不四舍五入到 0）
    return { expiresAt: endOfToday, days: 1 }
  }

  const days = option === 'custom' ? (customDays ?? 0) : OPTION_DAYS[option]
  if (!Number.isInteger(days) || days < 1 || days > SHARE_MAX_DAYS) {
    return null
  }

  return { expiresAt: new Date(now.getTime() + days * DAY_MS), days }
}
