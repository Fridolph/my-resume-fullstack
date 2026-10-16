import { describe, expect, it } from 'vitest'
import { fmtCurrency, fmtNumber, fmtUnit, formatPercentDisplay, getNumPrecision, toNumber } from '../src/number.js'

/**
 * `src/number.ts` 的数值格式化单元测试。
 *
 * 这组测试保护的是"对外承诺的确定性格式"，而不是实现细节：空值占位、宽松解析的边界、
 * 精度 / 千分位 / 符号三者的组合结果，以及两个第三方依赖（`a-calc` 的 `fmt`、
 * `radashi` 的 `toFloat` / `round` / `mul` / `div`）在当前版本下的**真实行为**。
 *
 * 会让它变红的改动：升级或替换 `a-calc` / `radashi` 导致分隔符、舍入或宽容解析变化；
 * 调整 `fmtNumber` 的默认值（`nullValue` / `thousands` / `position` / `space`）；
 * 改变 `keepPrecision` 覆盖 `precision` 的优先级；改动百分数互转的精度约定
 * （display 走 `options.precision`，param 固定 6 位小数）。
 */
describe('toNumber', () => {
  it('toNumber：null / undefined / 空串 / 纯空白都返回 null，而不是 0', () => {
    expect(toNumber(null)).toBeNull()
    expect(toNumber(undefined)).toBeNull()
    expect(toNumber('')).toBeNull()
    expect(toNumber('   ')).toBeNull()
  })

  it('toNumber：NaN 视为无法解析返回 null', () => {
    expect(toNumber(Number.NaN)).toBeNull()
  })

  it('toNumber：±Infinity 不被清洗，原样返回（记录现状，非认可现状）', () => {
    // 这里刻意断言"现状"而不是"应有行为"：Infinity 会被 `fmt` 渲染成占位 "-"，
    // 再被 `applySymbol` 当成负号处理，最终产出 `-$` / `-px` 这种错误文案。
    // 该缺陷已在交付报告中单列；若将来修掉，本用例应随之改为断言 null。
    expect(toNumber(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
    expect(toNumber(Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY)
    expect(toNumber('Infinity')).toBe(Number.POSITIVE_INFINITY)
  })

  it('toNumber：无法解析的字符串与布尔值返回 null', () => {
    expect(toNumber('abc')).toBeNull()
    expect(toNumber(true)).toBeNull()
    expect(toNumber(false)).toBeNull()
    expect(toNumber({})).toBeNull()
  })

  it('toNumber：0 与负数原样保留（0 不能被当成空值）', () => {
    expect(toNumber(0)).toBe(0)
    expect(toNumber(-12.5)).toBe(-12.5)
    expect(toNumber('0')).toBe(0)
  })

  it('toNumber：宽松解析，取数字前缀并忽略尾部字符', () => {
    expect(toNumber('12abc')).toBe(12)
    expect(toNumber(' 42 ')).toBe(42)
    expect(toNumber('007')).toBe(7)
    expect(toNumber('1e3')).toBe(1000)
    expect(toNumber('0.0111')).toBe(0.0111)
  })

  it('toNumber：逗号分隔串只取首段（"1,234" → 1），回填已格式化字符串会静默失真', () => {
    expect(toNumber('1,234')).toBe(1)
  })
})

describe('getNumPrecision', () => {
  it('getNumPrecision：按小数位数返回，整数为 0', () => {
    expect(getNumPrecision(1234567.891)).toBe(3)
    expect(getNumPrecision(100)).toBe(0)
    expect(getNumPrecision(0)).toBe(0)
    expect(getNumPrecision(-12.5)).toBe(1)
  })

  it('getNumPrecision：字符串先转数字，末尾 0 不计入位数（"3.140" → 2）', () => {
    expect(getNumPrecision('0.0111')).toBe(4)
    expect(getNumPrecision('3.140')).toBe(2)
  })

  it('getNumPrecision：无小数时回落到 defaultPlaces，显式传入才生效', () => {
    expect(getNumPrecision(0)).toBe(0)
    expect(getNumPrecision(0, 7)).toBe(7)
    expect(getNumPrecision(100, 7)).toBe(7)
    expect(getNumPrecision('abc', 7)).toBe(7)
  })

  it('getNumPrecision：科学计数法负数次幂按"系数小数位 + 指数"还原', () => {
    expect(getNumPrecision(1e-7)).toBe(7)
    expect(getNumPrecision(1.5e-7)).toBe(8)
  })

  it('getNumPrecision：正指数（1e21 → "1e+21"）走不到 e- 分支，回落到 defaultPlaces', () => {
    expect(getNumPrecision(1e21)).toBe(0)
    expect(getNumPrecision(1e21, 2)).toBe(2)
  })

  it('getNumPrecision：浮点误差会变成真实位数（0.1 + 0.2 → 17）', () => {
    expect(getNumPrecision(0.1 + 0.2)).toBe(17)
  })
})

describe('fmtNumber', () => {
  it('fmtNumber：null / undefined / 空串 / 非数字字符串统一落到默认占位 "-"', () => {
    expect(fmtNumber(null)).toBe('-')
    expect(fmtNumber(undefined)).toBe('-')
    expect(fmtNumber('')).toBe('-')
    expect(fmtNumber('abc')).toBe('-')
  })

  it('fmtNumber：nullValue 可自定义占位，且能覆盖"非数字"路径', () => {
    expect(fmtNumber(null, { nullValue: 'N/A' })).toBe('N/A')
    expect(fmtNumber('abc', { nullValue: '' })).toBe('')
  })

  it('fmtNumber：0 是有效值，不落占位', () => {
    expect(fmtNumber(0)).toBe('0')
    expect(fmtNumber(0, { symbol: '$' })).toBe('$0')
    expect(fmtNumber(0, { precision: 2 })).toBe('0.00')
  })

  it('fmtNumber：默认开启 en 千分位且保留原小数', () => {
    expect(fmtNumber(1234.5678)).toBe('1,234.5678')
    expect(fmtNumber(1234567.891)).toBe('1,234,567.891')
  })

  it('fmtNumber：thousands 为 false 时不分组', () => {
    expect(fmtNumber(1234.5678, { thousands: false })).toBe('1234.5678')
    expect(fmtNumber(1234567.89, { thousands: false })).toBe('1234567.89')
  })

  it('fmtNumber：precision 固定小数位并按四舍五入进位', () => {
    expect(fmtNumber(1234.5678, { precision: 2 })).toBe('1,234.57')
    expect(fmtNumber(1234.5, { precision: 2 })).toBe('1,234.50')
    expect(fmtNumber(1234.5678, { precision: 0 })).toBe('1,235')
    expect(fmtNumber(999.995, { precision: 2 })).toBe('1,000.00')
  })

  it('fmtNumber：keepPrecision 优先于 precision，用原值小数位覆盖', () => {
    expect(fmtNumber(1234.5, { keepPrecision: true })).toBe('1,234.5')
    expect(fmtNumber(1234.5678, { precision: 2, keepPrecision: true })).toBe('1,234.5678')
    expect(fmtNumber(1234.5, { precision: 2, keepPrecision: false })).toBe('1,234.50')
  })

  it('fmtNumber：keepPrecision 能还原极小值，不丢精度', () => {
    expect(fmtNumber(0.000001, { keepPrecision: true })).toBe('0.000001')
    expect(fmtNumber(1e-7, { keepPrecision: true })).toBe('0.0000001')
  })

  it('fmtNumber：千分位预设名切换分隔符与小数点', () => {
    expect(fmtNumber(1234.5678, { thousands: 'eu' })).toBe('1.234,5678')
    expect(fmtNumber(1234.5678, { thousands: 'swiss' })).toBe("1'234.5678")
    expect(fmtNumber(1234567.89, { thousands: 'space' })).toBe('1 234 567.89')
    expect(fmtNumber(1234567.89, { thousands: 'fr' })).toBe('1\u00A0234\u00A0567,89')
    expect(fmtNumber(12345678.9, { thousands: 'indian' })).toBe('1,23,45,678.9')
  })

  it('fmtNumber：自定义千分位对象可指定 sep / point / grouping', () => {
    expect(fmtNumber(1234.5678, { thousands: { sep: ' ', point: ',', grouping: [3] } })).toBe('1 234,5678')
    expect(fmtNumber(1234, { thousands: { sep: "'" } })).toBe("1'234")
    expect(fmtNumber(12345678.9, { thousands: { grouping: [3, 2] } })).toBe('1,23,45,678.9')
  })

  it('fmtNumber：symbol 默认加在数字前，负号始终在最外层', () => {
    expect(fmtNumber(-1234.5, { symbol: '$' })).toBe('-$1,234.5')
    expect(fmtNumber(1234.5, { symbol: '$' })).toBe('$1,234.5')
    expect(fmtNumber(1234.5, { symbol: '' })).toBe('1,234.5')
  })

  it('fmtNumber：position=after 与 space 组合决定符号位置和间隔', () => {
    expect(fmtNumber(-1234.5, { symbol: '$', position: 'after' })).toBe('-1,234.5$')
    expect(fmtNumber(-1234.5, { symbol: '$', position: 'after', space: true })).toBe('-1,234.5 $')
    expect(fmtNumber(-1234.5, { symbol: '$', space: true })).toBe('-$ 1,234.5')
    expect(fmtNumber(-1234.5, { thousands: false, symbol: '$', position: 'after', space: true })).toBe('-1234.5 $')
  })
})

describe('fmtCurrency', () => {
  it('fmtCurrency：默认两位小数、符号在前并开启千分位', () => {
    expect(fmtCurrency(1234.5, '$')).toBe('$1,234.50')
    expect(fmtCurrency(0.5, 'AUD')).toBe('AUD0.50')
  })

  it('fmtCurrency：调用方可覆盖 precision 与千分位设置', () => {
    expect(fmtCurrency(1234.5, '$', { precision: 0 })).toBe('$1,235')
    expect(fmtCurrency(1234.5, 'EUR', { thousands: 'eu', space: true })).toBe('EUR 1.234,50')
  })

  it('fmtCurrency：空值与负数走同一条占位 / 符号规则', () => {
    expect(fmtCurrency(null, '$')).toBe('-')
    expect(fmtCurrency(-0.005, '$')).toBe('-$0.01')
  })
})

describe('fmtUnit', () => {
  it('fmtUnit：默认两位小数、单位在后', () => {
    expect(fmtUnit(1234.5, 'px')).toBe('1,234.50px')
    expect(fmtUnit(1234.5, 'px', { precision: 0 })).toBe('1,235px')
  })

  it('fmtUnit：可关闭千分位，非法值落占位且不带单位', () => {
    expect(fmtUnit(1234.567, 'kg', { thousands: false })).toBe('1234.57kg')
    expect(fmtUnit('abc', 'kg')).toBe('-')
  })
})

describe('formatPercentDisplay', () => {
  it('formatPercentDisplay：display 把小数转百分数，默认保留 4 位', () => {
    expect(formatPercentDisplay(0.0111, 'display')).toEqual({ origin: 0.0111, value: 1.11 })
    expect(formatPercentDisplay(0.3333333, 'display', { precision: 2 })).toEqual({ origin: 0.3333333, value: 33.33 })
    expect(formatPercentDisplay(0.0111, 'display', { precision: 0 })).toEqual({ origin: 0.0111, value: 1 })
  })

  it('formatPercentDisplay：usage 默认 param，把百分数转回小数', () => {
    expect(formatPercentDisplay(11.11)).toEqual({ origin: 11.11, value: 0.1111 })
    expect(formatPercentDisplay(11.11, 'param')).toEqual({ origin: 11.11, value: 0.1111 })
    expect(formatPercentDisplay(50, 'param')).toEqual({ origin: 50, value: 0.5 })
  })

  it('formatPercentDisplay：null 与非数值原样回传 origin，value 为 null', () => {
    expect(formatPercentDisplay(null)).toEqual({ origin: null, value: null })
    expect(formatPercentDisplay(Number.NaN)).toEqual({ origin: Number.NaN, value: null })
  })

  it('formatPercentDisplay：0 视为有效值，两个方向都返回 0', () => {
    expect(formatPercentDisplay(0)).toEqual({ origin: 0, value: 0 })
    expect(formatPercentDisplay(0, 'display')).toEqual({ origin: 0, value: 0 })
  })

  it('formatPercentDisplay：负数方向与正数一致，符号跟随 origin', () => {
    expect(formatPercentDisplay(-5)).toEqual({ origin: -5, value: -0.05 })
    expect(formatPercentDisplay(-0.5, 'display')).toEqual({ origin: -0.5, value: -50 })
  })

  it('formatPercentDisplay：param 方向固定 6 位小数截断', () => {
    expect(formatPercentDisplay(11.115, 'param')).toEqual({ origin: 11.115, value: 0.11115 })
    expect(formatPercentDisplay(100, 'param')).toEqual({ origin: 100, value: 1 })
  })
})
