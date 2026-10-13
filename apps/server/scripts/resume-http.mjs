import assert from 'node:assert/strict'
import { PrismaClient } from '../dist/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../dist/common/password.js'
import { resumeFixture } from '../../../packages/common/test/fixtures/resume.mjs'

const databaseUrl = process.env.RESUME_TEST_DATABASE_URL
assert.ok(databaseUrl?.startsWith('postgresql://resume_test@127.0.0.1:55433/'), '仅允许指定的隔离数据库')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
const base = process.env.RESUME_TEST_API_BASE ?? 'http://127.0.0.1:4049/api'
assert.ok(/^http:\/\/127\.0\.0\.1:(4049|4059)\/api$/.test(base), '仅允许隔离本机服务')
async function request(path, method, body, token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: response.status, body: await response.json() }
}
try {
  const passwordHash = await hashPassword('ResumeTest-028!')
  const permission = await prisma.permission.upsert({
    where: { key: 'Resume.Sections:edit' },
    create: { key: 'Resume.Sections:edit' },
    update: {},
  })
  const editor = await prisma.role.upsert({
    where: { key: 'admin' },
    create: { key: 'admin', name: '测试管理员' },
    update: {},
  })
  const ordinary = await prisma.role.upsert({
    where: { key: 'user' },
    create: { key: 'user', name: '测试普通用户' },
    update: {},
  })
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: editor.id, permissionId: permission.id } },
    create: { roleId: editor.id, permissionId: permission.id },
    update: {},
  })
  for (const [username, role] of [
    ['resume_editor', editor],
    ['resume_other', editor],
    ['resume_reader', ordinary],
  ]) {
    await prisma.user.upsert({
      where: { username },
      create: { username, nickname: username, passwordHash, roles: { create: { roleId: role.id } } },
      update: { passwordHash },
    })
  }
  const login = async account => {
    const result = await request('/auth/login', 'POST', { account, password: 'ResumeTest-028!' })
    assert.equal(result.status, 200)
    assert.ok(result.body.data.token)
    assert.equal(JSON.stringify(result.body).includes('passwordHash'), false)
    return result.body.data.token
  }
  const token = await login('resume_editor')
  const otherToken = await login('resume_other')
  const readerToken = await login('resume_reader')
  assert.equal((await request('/resume/unknown/draft', 'GET')).status, 401)
  assert.equal(
    (await request('/auth/login', 'POST', { account: 'resume_editor', password: 'wrong-password' })).status,
    401,
  )
  assert.equal((await request('/auth/info', 'GET', null, token)).status, 200)
  const document = resumeFixture()
  const input = { name: '隔离测试', locale: 'zh', document }
  assert.equal((await request('/resume', 'POST', input, readerToken)).status, 403)
  const reader = await prisma.user.findUniqueOrThrow({ where: { username: 'resume_reader' } })
  await prisma.resumeWorkspace.upsert({ where: { userId: reader.id }, create: { userId: reader.id }, update: {} })
  const readerResume = await prisma.resume.create({
    data: {
      name: '只读草稿',
      locale: 'zh',
      workspaceUserId: reader.id,
      draft: { create: { document, schemaVersion: 1, updatedBy: reader.id } },
    },
  })
  assert.equal((await request(`/resume/${readerResume.id}/draft`, 'GET', null, readerToken)).status, 200)
  const created = await request('/resume', 'POST', input, token)
  assert.equal(created.status, 201)
  const id = created.body.data.resume.id
  assert.equal(created.body.data.revision, 1)
  assert.equal((await request(`/resume/${id}/draft`, 'GET', null, otherToken)).status, 404)
  assert.equal((await request(`/resume/${id}/draft`, 'PUT', { expectedRevision: 1, document }, otherToken)).status, 404)
  assert.equal(
    (await request(`/resume/${id}/draft`, 'PUT', { expectedRevision: 1, document }, readerToken)).status,
    403,
  )
  const invalid = structuredClone(document)
  invalid.content.sections[1].data.dimensions[0].score = 99
  assert.equal(
    (await request(`/resume/${id}/draft`, 'PUT', { expectedRevision: 1, document: invalid }, token)).status,
    400,
  )
  const [first, second] = await Promise.all([
    request(`/resume/${id}/draft`, 'PUT', { expectedRevision: 1, document }, token),
    request(`/resume/${id}/draft`, 'PUT', { expectedRevision: 1, document }, token),
  ])
  assert.deepEqual([first.status, second.status].sort(), [200, 409])
  const conflicting = first.status === 409 ? first : second
  assert.equal(conflicting.body.errorCode, 'Resume.Draft:conflict')
  const read = await request(`/resume/${id}/draft`, 'GET', null, token)
  assert.equal(read.body.data.revision, 2)
  assert.deepEqual(read.body.data.document, document)
  await prisma.resume.update({ where: { id }, data: { deletedAt: new Date() } })
  assert.equal((await request(`/resume/${id}/draft`, 'GET', null, token)).status, 404)
  console.log('PASS: 登录/会话、401、403、所有权404、无效输入400、并发200+409、刷新恢复、软删除404；仅隔离测试库')
} finally {
  await prisma.$disconnect()
}
