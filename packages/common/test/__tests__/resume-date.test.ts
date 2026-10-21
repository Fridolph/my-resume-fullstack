import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  formatResumeDate,
  formatResumeDay,
  isValidResumeDayIso,
  parseResumeDay,
  resumeDayToInput,
  toResumeDayIso,
} from '../../src/resume/date.js'

/**
 * 日期工具的边界。
 *
 * 这一组测试保护的是"**不会把非法日期静默写进库**"：
 * `new Date('2026-02-30')` 会自己滚到 3 月 2 日、`new Date('2026-13-01')` 变化 Invalid Date。
 * 所以解析必须是**严格模式**（`dayjs.utc(value, 'YYYY-MM-DD', true)`），
 * 而不是让日期库去猜。
 */

test('合法输入 → UTC 零点 ISO（入库形态统一）', () => {
  assert.equal(toResumeDayIso('2026-10-08'), '2026-10-08T00:00:00.000Z')
  // 闰日合法
  assert.equal(toResumeDayIso('2024-02-29'), '2024-02-29T00:00:00.000Z')
})

test('非法输入一律返回 null（不让 Date 静默修正）', () => {
  for (const bad of [
    '2026-02-30', // 2026 不是闰年 → 2 月没有 30 号
    '2026-13-01', // 月份越界
    '2026-00-10', // 月份 0
    '2026-1-8', // 不补零 → 不符合 YYYY-MM-DD
    '2026/10/08', // 分隔符不对
    '2026-10-08T00:00:00.000Z', // 已经是存储形态，不是输入形态
    '', // 空
  ]) {
    assert.equal(toResumeDayIso(bad), null, `应拒绝：${bad}`)
    assert.equal(parseResumeDay(bad), null, `应拒绝：${bad}`)
  }
})

test('存储形态校验：格式对但日历不对也要拒', () => {
  assert.equal(isValidResumeDayIso('2026-10-08T00:00:00.000Z'), true)
  assert.equal(isValidResumeDayIso('2026-02-30T00:00:00.000Z'), false)
  // 非零点：契约只认"零点"这一条规则
  assert.equal(isValidResumeDayIso('2026-10-08T08:00:00.000Z'), false)
  // 只有年月（旧格式）
  assert.equal(isValidResumeDayIso('2026-10'), false)
})

test('存储形态 ⇄ 输入：往返不丢天', () => {
  assert.equal(resumeDayToInput('2026-10-08T00:00:00.000Z'), '2026-10-08')
  assert.equal(toResumeDayIso(resumeDayToInput('2026-10-08T00:00:00.000Z')), '2026-10-08T00:00:00.000Z')
})

test('格式化走 UTC，不受本机时区影响', () => {
  // 若实现里用了本地时区的 dayjs(...)，UTC 以西的环境会显示成 10-07
  assert.equal(formatResumeDay('2026-10-08T00:00:00.000Z'), '2026.10')
  assert.equal(formatResumeDay('2026-10-08T00:00:00.000Z', 'YYYY-MM-DD'), '2026-10-08')
})

test('三端共用的摘要：custom / 至今 / 有结束日 / 空', () => {
  assert.equal(formatResumeDate({ mode: 'custom', text: '2024年至今' }), '2024年至今')
  assert.equal(formatResumeDate({ mode: 'custom', text: '   ' }), '未填写')
  assert.equal(formatResumeDate(undefined), '未填写')
  assert.equal(
    formatResumeDate({ mode: 'structured', start: '2020-09-01T00:00:00.000Z', end: null, isCurrent: true }),
    '2020.09 ~ 至今',
  )
  assert.equal(
    formatResumeDate({
      mode: 'structured',
      start: '2020-09-01T00:00:00.000Z',
      end: '2023-06-30T00:00:00.000Z',
      isCurrent: false,
    }),
    '2020.09 ~ 2023.06',
  )
})
