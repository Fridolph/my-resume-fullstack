import dayjs, { type Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import utc from 'dayjs/plugin/utc.js'
import type { ResumeDate } from './document.js'

dayjs.extend(customParseFormat)
dayjs.extend(utc)

/** 输入控件产出的日期格式（年月日，精确到天） */
export const RESUME_DAY_FORMAT = 'YYYY-MM-DD'

/**
 * 契约里结构化日期的**存储形态**：ISO 8601 的 **UTC 零点**。
 *
 * ## 为什么是"零点"而不是任意时刻
 *
 * 简历里的时间是**日历日**（"2020-09-01 到 2023-06-30"），没有时刻语义。
 * 统一成 UTC 零点后：
 * - "同一天"在任何时区都是**同一个字符串**；
 * - `start > end` 的字符串比较依然成立（等长、字典序即时间序）；
 * - 一旦混入非零点或不同偏移量，`2026-10-08T00:00:00+08:00` 与 `2026-10-07T16:00:00Z`
 *   代表同一刻却字符串不等 —— 排序、去重、"是否同一天"全都会出错。
 *
 * ⚠️ **时区前提**：零点存 UTC，所以**读取时必须走本文件的格式化函数**，
 * 不要直接 `new Date(iso).toLocaleDateString()` —— 那在 UTC 以西的时区会显示成前一天。
 */
export const RESUME_DAY_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/

/**
 * 严格解析「年月日」输入。
 *
 * 用 `dayjs.utc(value, fmt, true)` 的**严格模式**：不让 dayjs 去猜。
 * `2026-13-45`、`2026-02-31` 这类会被 `new Date()` 静默"修正"成别的日子，这里必须返回 `null`。
 *
 * @returns 合法时返回 UTC 的 Dayjs，否则 `null`
 */
export function parseResumeDay(value: string): Dayjs | null {
  const parsed = dayjs.utc(value, RESUME_DAY_FORMAT, true)
  return parsed.isValid() ? parsed : null
}

/**
 * 把「年月日」输入转成契约里的存储形态（UTC 零点 ISO）。
 *
 * @returns 合法时返回 `2026-10-08T00:00:00.000Z`，非法输入返回 `null`（由调用方决定怎么提示）
 */
export function toResumeDayIso(value: string): string | null {
  const parsed = parseResumeDay(value)
  return parsed ? parsed.startOf('day').toISOString() : null
}

/** 存储形态 → 输入控件的值（`2026-10-08T00:00:00.000Z` → `2026-10-08`） */
export function resumeDayToInput(iso: string): string {
  return iso.slice(0, RESUME_DAY_FORMAT.length)
}

/**
 * 校验一个字符串是不是**合法的**日期存储形态。
 *
 * 只匹配格式不够：`2026-02-31T00:00:00.000Z` 格式对、日子不存在。
 * 用"格式化回去必须等值"来兜住 —— 闰年、月长、月末都由 dayjs 负责，不手写日历。
 */
export function isValidResumeDayIso(value: string): boolean {
  if (!RESUME_DAY_ISO_PATTERN.test(value)) {
    return false
  }
  const parsed = dayjs.utc(value)
  return parsed.isValid() && parsed.startOf('day').toISOString() === value
}

/** 存储形态 → 展示串（默认 `2020.09.01`；展示层可按需换 pattern） */
export function formatResumeDay(iso: string, pattern = 'YYYY.MM.DD'): string {
  return dayjs.utc(iso).format(pattern)
}

/**
 * 日期的**人类可读摘要** —— 三端共用（web 工作台 / admin 编辑页 / 只读详情）。
 *
 * 三端各写一份的后果已经出现过一次（admin 有、web 没有），所以收在共享层：
 * 展示规则只有一处，改格式不会漏掉某一端。
 */
export function formatResumeDate(date: ResumeDate | undefined): string {
  if (!date) {
    return '未填写'
  }

  if (date.mode === 'custom') {
    return date.text.trim() === '' ? '未填写' : date.text
  }

  const start = formatResumeDay(date.start)
  if (date.isCurrent) {
    return `${start} ~ 至今`
  }

  return date.end ? `${start} ~ ${formatResumeDay(date.end)}` : start
}
