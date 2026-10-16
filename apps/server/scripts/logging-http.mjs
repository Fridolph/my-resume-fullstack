import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { PrismaClient } from '../dist/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../dist/common/password.js'

/**
 * DAO-044 的日志验收（对照卡里的 8 条标准）。
 *
 * ## 为什么单独一个脚本，而不是并进 `resume-http.mjs`
 *
 * 那个脚本验的是**业务语义**（403 / 404 / 409 / 校验 / 并发），本脚本验的是**可观测性与安全**：
 * 四处 ID 是否一致、日志里有没有凭据与简历内容。两者的"会变红"的原因完全不同，
 * 混在一起会让失败信号变模糊。
 *
 * ## 安全闸
 *
 * 与 `resume-http.mjs` 同样的两道：**只允许指定的隔离数据库**、**只允许隔离本机服务**。
 * 因为本脚本会真实写入一份含 PII 的简历 —— 绝不能在开发库上跑。
 */

const databaseUrl = process.env.RESUME_TEST_DATABASE_URL
assert.ok(databaseUrl?.startsWith('postgresql://resume_test@127.0.0.1:55433/'), '仅允许指定的隔离数据库')

const base = process.env.RESUME_TEST_API_BASE ?? ''
assert.ok(/^http:\/\/127\.0\.0\.1:(4049|4059)\/api$/.test(base), '仅允许隔离本机服务')

const logFile = process.env.RESUME_TEST_LOG_FILE
assert.ok(logFile, '缺少 RESUME_TEST_LOG_FILE（服务端日志路径）')

/** 会在请求体里出现、因此**绝不允许出现在日志里**的敏感串 */
const PII = {
  name: 'PII_NAME_张三丰',
  phone: 'PII_PHONE_13800138000',
  email: 'PII_EMAIL_leak@example.com',
}
const BEARER = 'PII_BEARER_TOKEN_DO_NOT_LOG'
const COOKIE = 'PII_COOKIE_VALUE_DO_NOT_LOG'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

/** 把日志文件按 NDJSON 解析；读不到就返回空数组（启动早期的边界） */
function readLog() {
  let raw = ''
  try {
    raw = readFileSync(logFile, 'utf8')
  } catch {
    return []
  }
  return raw
    .split('\n')
    .filter(Boolean)
    .flatMap(line => {
      try {
        return [JSON.parse(line)]
      } catch {
        return []
      }
    })
}

/** 取某次请求产生的所有日志行：`req.id` 命中，或消息里带上了 `[id]` */
function linesForTraceId(traceId) {
  return readLog().filter(entry => entry?.req?.id === traceId || String(entry?.msg ?? '').includes(traceId))
}

async function request(path, { method = 'GET', body, token, traceId, extraHeaders } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(traceId ? { 'x-request-id': traceId } : {}),
      ...extraHeaders,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await response.text()
  await sleep(120) // 等访问日志落盘（它写在响应 finish 之后）
  return { status: response.status, header: response.headers.get('x-request-id'), body: JSON.parse(text) }
}

const results = []
async function check(name, run) {
  try {
    await run()
    results.push([name, true, ''])
  } catch (error) {
    results.push([name, false, error instanceof Error ? error.message : String(error)])
  }
}

try {
  // ── 准备一个可写入的身份（隔离库，独立于 resume-http.mjs 建的那批）────────────
  const passwordHash = await hashPassword('LoggingTest-044!')
  const permission = await prisma.permission.upsert({
    where: { key: 'Resume.Sections:edit' },
    create: { key: 'Resume.Sections:edit' },
    update: {},
  })
  const adminRole = await prisma.role.upsert({
    where: { key: 'admin' },
    create: { key: 'admin', name: '测试管理员' },
    update: {},
  })
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
    create: { roleId: adminRole.id, permissionId: permission.id },
    update: {},
  })
  await prisma.user.upsert({
    where: { username: 'logging_editor' },
    create: {
      username: 'logging_editor',
      nickname: 'logging_editor',
      passwordHash,
      roles: { create: { roleId: adminRole.id } },
    },
    update: { passwordHash },
  })
  const login = await request('/auth/login', {
    method: 'POST',
    body: { account: 'logging_editor', password: 'LoggingTest-044!' },
  })
  assert.equal(login.status, 200, '登录失败，后续写入无法进行')
  const token = login.body.data.token
  assert.ok(token)

  // ── 标准 6：请求头 ID == 日志 ID == 响应头 == 响应体 traceId ────────────────
  const knownId = 'four-way-consistency-0001'
  const fourWay = await request('/resume', { traceId: knownId })
  await check('6. 四处 ID 一致（请求头 / 日志 req.id / 响应头 / 响应体 traceId）', () => {
    assert.equal(fourWay.status, 401, '未登录应 401')
    assert.equal(fourWay.header, knownId, '响应头 x-request-id 与请求头不一致')
    assert.equal(fourWay.body.traceId, knownId, '响应体 traceId 与请求头不一致')
    const logged = linesForTraceId(knownId)
    assert.ok(logged.length > 0, `日志里找不到 traceId=${knownId} 的行`)
    const access = logged.find(entry => (entry.res === undefined ? false : true))
    assert.ok(access, '找不到该请求的访问日志行')
    assert.equal(access.req.id, knownId, '访问日志的 req.id 与请求头不一致')
  })

  // ── 标准 2：未登录 401 仍有请求 ID（守卫前生成的设计没退化）──────────────────
  const anonymous = await request('/resume')
  await check('2. 未登录 401 仍有请求 ID（守卫前生成）', () => {
    assert.equal(anonymous.status, 401)
    assert.ok(anonymous.header, '响应头没有 x-request-id')
    assert.ok(anonymous.body.traceId, '响应体没有 traceId')
    const logged = linesForTraceId(anonymous.body.traceId)
    assert.ok(logged.length > 0, '日志里没有这次 401 的行')
  })

  // ── 标准 3：DTO 校验失败时访问日志完整 ───────────────────────────────────
  const invalidId = 'validation-failure-0002'
  const invalid = await request('/auth/login', { method: 'POST', body: { account: '' }, traceId: invalidId })
  await check('3. 校验失败：既有访问日志、又有校验错误', () => {
    assert.equal(invalid.status, 400)
    const logged = linesForTraceId(invalidId)
    const access = logged.find(entry => entry.res !== undefined)
    assert.ok(access, '缺少访问日志行')
    assert.equal(access.res.statusCode, 400)
    assert.ok(
      logged.some(entry => entry.level >= 40 && String(entry.msg ?? '').includes('400')),
      '缺少校验失败的那条错误/warn 日志',
    )
  })

  // ── 标准 5：并发请求的日志上下文不串 ────────────────────────────────────
  const idA = 'concurrency-A-0003'
  const idB = 'concurrency-B-0004'
  await Promise.all([
    request('/resume', { traceId: idA, extraHeaders: { 'x-request-id': idA } }),
    request('/resume', { traceId: idB, extraHeaders: { 'x-request-id': idB } }),
  ])
  await check('5. 并发两请求：日志上下文不串', () => {
    const linesA = linesForTraceId(idA)
    const linesB = linesForTraceId(idB)
    assert.ok(linesA.length > 0 && linesB.length > 0, '并发请求的日志缺失')
    // 关键断言：A 的行里不能出现 B 的 id（反向同理）—— 上下文串了就会同时出现
    assert.ok(!linesA.some(entry => JSON.stringify(entry).includes(idB)), 'A 的日志行里混入了 B 的 id')
    assert.ok(!linesB.some(entry => JSON.stringify(entry).includes(idA)), 'B 的日志行里混入了 A 的 id')
  })

  // ── 标准 1 + 7：成功保存一次，且日志里搜不到凭据与简历内容 ────────────────
  const created = await request('/resume', {
    method: 'POST',
    token,
    body: {
      name: '日志验收简历',
      locale: 'zh',
      // 契约要求 `document`；这里给最小输入（只给姓名），服务端会补全为完整文档
      document: { content: { sections: [{ type: 'profile', data: { name: '日志验收' } }] } },
    },
  })
  assert.equal(created.status, 201, '创建简历失败')
  const resumeId = created.body.data.resume.id

  const draft = await request(`/resume/${resumeId}/draft`, { token })
  assert.equal(draft.status, 200, '读取草稿失败')
  const document = draft.body.data.document
  // 把 PII 写进**请求体**：这正是 `PUT /resume/:id/draft` 的真实风险面
  document.content.sections[0].data.summary = `${PII.name} ${PII.phone} ${PII.email}`
  // 两种鉴权载体的**值**都必须不进日志。Cookie 与假 Bearer 走这个匿名请求 ——
  // ⚠️ 不能把它们塞进下面的保存请求：`Authorization` 会覆盖真实 token，把 200 变成 401
  //    （第一版就是这么写的，验收里如实暴露了出来）。
  await request('/resume', {
    extraHeaders: { Cookie: `my-resume.token=${COOKIE}`, Authorization: `Bearer ${BEARER}` },
  })

  const saveId = 'successful-save-0005'
  const saved = await request(`/resume/${resumeId}/draft`, {
    method: 'PUT',
    token,
    traceId: saveId,
    body: { expectedRevision: draft.body.data.revision, document },
  })
  await check('1. 成功保存的访问日志含状态码 / 耗时 / 请求 ID', () => {
    assert.equal(saved.status, 200, `保存应 200，实际 ${saved.status}`)
    const access = linesForTraceId(saveId).find(entry => entry.res !== undefined)
    assert.ok(access, '找不到保存请求的访问日志行')
    assert.equal(access.res.statusCode, 200)
    assert.equal(typeof access.responseTime, 'number', '访问日志缺少 responseTime')
    assert.ok(access.req.id, '访问日志缺少请求 ID')
  })

  await check('7. 凭据与简历内容零泄漏（cookie / Bearer / 真实 JWT / 姓名 / 手机 / 邮箱）', () => {
    const text = JSON.stringify(readLog())
    for (const [label, value] of [
      ['Cookie 值', COOKIE],
      ['假 Bearer 值', BEARER],
      // 真实 JWT：它是最该脱敏的凭据 —— 拿到它就能冒充该用户
      ['真实访问令牌', token],
      ['姓名', PII.name],
      ['手机号', PII.phone],
      ['邮箱', PII.email],
      ['cookie 名', 'my-resume.token='],
    ]) {
      assert.equal(text.includes(value), false, `日志里出现了${label}`)
    }
  })

  // ── 标准 4：DB 故障 → 500，有可关联堆栈，且响应体不含内部细节 ──────────────
  //
  // 这里**真的把隔离库停掉**来制造故障，而不是伪造一个异常 —— 只有真故障才能验到
  // "Prisma 抛错 → 过滤器记栈 → 客户端只看到稳定文案"这条完整链路。
  // 停的是 `mktemp -d` 出来的临时实例（外层 shell 的 cleanup 还会再停一次，无副作用）。
  //
  // 用 `/resume/public`：它是 `@Public()` 且要查库 —— 停库之后仍能发起（不需要先登录拿 token）。
  const pgData = process.env.RESUME_TEST_PG_DATA
  if (pgData) {
    await prisma.$disconnect()
    execFileSync('pg_ctl', ['-D', pgData, 'stop', '-m', 'fast'], { stdio: 'ignore' })

    const brokenId = 'db-failure-0006'
    const broken = await request('/resume/public', { traceId: brokenId })
    await check('4. DB 故障 500：有可关联堆栈，响应体不含内部细节', () => {
      assert.equal(broken.status, 500, `应 500，实际 ${broken.status}`)
      assert.equal(broken.body.message, '服务器内部错误', '响应体泄露了内部错误信息')
      assert.equal(broken.body.traceId, brokenId, '响应体 traceId 与请求头不一致')

      const logged = linesForTraceId(brokenId)
      const withStack = logged.filter(entry => JSON.stringify(entry.err ?? {}).includes('stack'))
      assert.ok(withStack.length > 0, '日志里找不到带 stack 的记录')
      // 卡里的要求：真实栈**只有一条** —— pino-http 那个指向自身内部的合成占位必须被去掉
      assert.equal(withStack.length, 1, `带 stack 的日志应只有一条，实际 ${withStack.length} 条`)

      const access = logged.find(entry => entry.res !== undefined)
      assert.ok(access, '缺少访问日志行')
      assert.equal('err' in access, false, '访问日志不该带 err（合成占位应已按设计去掉）')
    })
  } else {
    results.push(['4. DB 故障 500（未设置 RESUME_TEST_PG_DATA，跳过）', true, 'SKIP'])
  }
} catch (error) {
  // 前置步骤（建号 / 登录 / 建简历）失败时也要落进报告 —— 裸抛只剩一坨 assert 栈，
  // 看不出"哪一条标准没过、为什么"
  results.push(['前置准备（建号 / 登录 / 建简历）', false, error instanceof Error ? error.message : String(error)])
} finally {
  await prisma.$disconnect()
}

console.log('')
let failed = 0
for (const [name, ok, detail] of results) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` —— ${detail}` : ''}`)
  if (!ok) failed += 1
}
console.log('')
if (failed > 0) {
  console.error(`FAIL: ${failed} 条未通过`)
  process.exit(1)
}
console.log('PASS: DAO-044 日志验收（仅隔离测试库与本机服务）')
