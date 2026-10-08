import type { ThousandsPresetName } from 'a-calc'
import { div, fmt, mul } from 'a-calc'
import { isNumber, round, toFloat } from 'radashi'

export { isNumber }

export type NumberThousandsPreset = ThousandsPresetName

export interface NumberThousandsCustom {
  sep?: string
  point?: string
  grouping?: number[]
}

export interface FmtNumberOptions {
  /** 固定小数位数；不传则保留原小数 */
  precision?: number
  /** 用原值的小数位数覆盖 precision */
  keepPrecision?: boolean
  /**
   * 千分位。
   * - true / 不传：en（1,234.56）
   * - false：不分组
   * - 预设名：en / eu / swiss / fr / space / indian / wan
   * - 对象：自定义分隔符
   */
  thousands?: boolean | NumberThousandsPreset | NumberThousandsCustom
  /** 货币符号或单位 */
  symbol?: string
  /** 符号位置，默认 before */
  position?: 'before' | 'after'
  /** 符号和数字之间是否加空格 */
  space?: boolean
  /** 空值或无法解析时的占位，默认 '-' */
  nullValue?: string
}

const CUSTOM_THOUSANDS_KEY = 'custom'

/**
 * 转成数字；空值或无法解析时返回 null（radashi `toFloat` 默认失败值是 0）
 */
export function toNumber(value: unknown): number | null {
  return toFloat(value, null)
}

/**
 * 获取数字的小数位数
 */
export function getNumPrecision(num: number | string, defaultPlaces = 0): number {
  const numString = Number(num).toString()

  if (numString.includes('e-')) {
    const [coefficient, exponentStr] = numString.split('e-')
    const exponent = Number(exponentStr)
    const coefficientDecimalPlaces = Number(coefficient).toString().split('.')[1]?.length || 0
    return coefficientDecimalPlaces + exponent
  }

  const decimalPart = numString.split('.')[1]
  return decimalPart?.length || defaultPlaces
}

function isThousandsCustom(value: FmtNumberOptions['thousands']): value is NumberThousandsCustom {
  return typeof value === 'object' && value != null
}

function applySymbol(
  formatted: string,
  symbol: string | undefined,
  position: 'before' | 'after',
  space: boolean,
): string {
  if (!symbol) return formatted

  const gap = space ? ' ' : ''
  const negative = formatted.startsWith('-')
  const abs = negative ? formatted.slice(1) : formatted
  const withSymbol = position === 'after' ? `${abs}${gap}${symbol}` : `${symbol}${gap}${abs}`

  return negative ? `-${withSymbol}` : withSymbol
}

/**
 * 格式化数字。分隔符、精度、符号全部由参数决定，不读站点 region。
 */
export function fmtNumber(value: unknown, options: FmtNumberOptions = {}): string {
  const {
    keepPrecision = false,
    thousands = true,
    symbol,
    position = 'before',
    space = false,
    nullValue = '-',
  } = options

  const n = toNumber(value)
  if (n === null) return nullValue

  const precision = keepPrecision ? getNumPrecision(value as number | string) : options.precision
  const tokens: string[] = []

  if (precision != null) tokens.push(`=${precision}~5`)

  const fmtOptions: { _thousands?: Record<string, NumberThousandsCustom> } = {}

  if (isThousandsCustom(thousands)) {
    tokens.push(`!t:${CUSTOM_THOUSANDS_KEY}`)
    fmtOptions._thousands = { [CUSTOM_THOUSANDS_KEY]: thousands }
  } else if (thousands === true) {
    tokens.push('!t:en')
  } else if (typeof thousands === 'string') {
    tokens.push(`!t:${thousands}`)
  }

  const formatted = String(fmt(n, tokens.join(' ') || undefined, fmtOptions))
  return applySymbol(formatted, symbol, position, space)
}

const intlFormatterCache = new Map<string, Intl.NumberFormat>()

/**
 * 用 Intl.NumberFormat 格式化。locale 和 options 由调用方传入，不读站点 region。
 */
export function fmtIntl(value: unknown, locale = 'en-US', options: Intl.NumberFormatOptions = {}): string {
  const n = toNumber(value)
  if (n === null) return '-'

  const cacheKey = `${locale}:${JSON.stringify(options)}`
  let formatter = intlFormatterCache.get(cacheKey)

  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, options)
      intlFormatterCache.set(cacheKey, formatter)
    } catch {
      return String(n)
    }
  }

  return formatter.format(n)
}

/**
 * 格式化货币。默认 2 位小数、符号在前；千分位和符号都由参数传入。
 */
export function fmtCurrency(value: unknown, symbol: string, options: Omit<FmtNumberOptions, 'symbol'> = {}): string {
  return fmtNumber(value, {
    precision: 2,
    position: 'before',
    ...options,
    symbol,
  })
}

/**
 * 格式化带单位的数字。默认 2 位小数、单位在后。
 */
export function fmtUnit(value: unknown, unit: string, options: Omit<FmtNumberOptions, 'symbol'> = {}): string {
  return fmtNumber(value, {
    precision: 2,
    position: 'after',
    ...options,
    symbol: unit,
  })
}

/**
 * 百分比与小数互转。
 * 和后端约定：存储为小数，前端按百分数展示，提交时再转回小数。
 *
 * - display: 0.0111 → 1.11
 * - param: 11.11 → 0.1111
 */
export function formatPercentDisplay(
  origin: number | null,
  usage: 'display' | 'param' = 'param',
  options = { precision: 4 },
): { origin: number | null; value: number | null } {
  if (origin == null || !isNumber(origin)) return { origin, value: null }

  const value = usage === 'display' ? round(mul(origin, 100), options.precision) : round(div(origin, 100), 6)

  return { origin, value }
}
