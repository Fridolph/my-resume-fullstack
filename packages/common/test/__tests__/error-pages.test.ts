import assert from 'node:assert/strict'
import { test } from 'vitest'
import { API_ERROR_MESSAGES } from '../../src/api/constants'
import { resolveErrorPage } from '../../src/ui/error-pages'

/**
 * 错误页的分类与文案是**纯函数**，所以它值得有测试：
 * 它是"用户看到的最后一块界面"，分类错了不会有任何运行时报错，只会静默地给错建议
 *（比如 401 却让人"返回首页"、403 却让人"去登录"）。
 */
test('401 与 403 说的话不同：一个是身份失效，一个是权限不足', () => {
  const unauthorized = resolveErrorPage(401, undefined)
  const forbidden = resolveErrorPage(403, undefined)

  assert.equal(unauthorized.kind, 'unauthorized')
  assert.equal(forbidden.kind, 'forbidden')
  // 按钮是固定的两个（返回上一页 / 返回主页），所以差异只能落在文案上
  assert.notEqual(unauthorized.title, forbidden.title)
  // Owner 2026-10-16：403 页只做告知，不给"切换账号"
  assert.match(forbidden.hint ?? '', /仅对超级管理员开放/)
})

test('按钮不再随状态码变化：配置里没有"主按钮"字段', () => {
  const config = resolveErrorPage(403, undefined)
  assert.equal('primaryAction' in config, false)
  assert.equal('primaryLabel' in config, false)
})

test('errorCode 文案优先于状态码文案（更精确的那句）', () => {
  const byCode = resolveErrorPage(403, 'Audit.Log:view')
  const byStatus = resolveErrorPage(403, undefined)

  assert.equal(byCode.description, '仅超级管理员可查阅审计记录')
  assert.equal(byStatus.description, API_ERROR_MESSAGES[403])
  assert.notEqual(byCode.description, byStatus.description, '接不上错误码就等于白接')
})

test('认不出的 errorCode 退回状态码文案，而不是露出英文键', () => {
  const config = resolveErrorPage(403, 'Some.Unknown:thing')
  assert.equal(config.description, API_ERROR_MESSAGES[403])
})

test('404 / 5xx / 非 HTTP 错误各自落到正确的类别', () => {
  assert.equal(resolveErrorPage(404, undefined).kind, 'not-found')
  assert.equal(resolveErrorPage(404, undefined).badge, '404')

  const serverError = resolveErrorPage(500, undefined)
  assert.equal(serverError.kind, 'unknown')
  assert.equal(serverError.badge, '500')

  const noStatus = resolveErrorPage(undefined, undefined)
  assert.equal(noStatus.kind, 'unknown')
  assert.equal(noStatus.badge, 'ERROR')
  assert.ok(noStatus.description.length > 0, '兜底文案不能是空串')
})
