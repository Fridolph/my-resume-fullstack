/** 仅允许隔离 PostgreSQL：迁移、真实登录/配置持久化、并发保护和 PDF 响应。 */
import assert from 'node:assert/strict'
import { PrismaClient } from '../dist/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../dist/common/password.js'
import { defaultResumePdfConfig } from '@rs/common'
const databaseUrl = process.env.RESUME_TEST_DATABASE_URL
assert.equal(databaseUrl, 'postgresql://resume_pdf_test@127.0.0.1:55439/postgres', '仅允许本任务隔离数据库')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
const base = 'http://127.0.0.1:4159/api'
async function req(path, method = 'GET', body, token) {
  const response = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (response.headers.get('content-type')?.startsWith('application/pdf'))
    return { status: response.status, pdf: Buffer.from(await response.arrayBuffer()) }
  return { status: response.status, body: await response.json() }
}
try {
  const passwordHash = await hashPassword('Isolated-Pdf-59!')
  const role = await prisma.role.create({ data: { key: 'pdf_editor', name: '隔离配置编辑' } })
  for (const key of ['Resume.Display:edit', 'Resume.Sections:edit']) {
    const permission = await prisma.permission.create({ data: { key } })
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
  }
  const users = []
  for (const username of ['pdf_owner', 'pdf_other']) {
    const user = await prisma.user.create({
      data: { username, nickname: username, passwordHash, roles: { create: { roleId: role.id } } },
    })
    users.push(user)
  }
  // 正文编辑要求管理员角色，隔离角色改为admin，不影响任何现有库。
  await prisma.role.update({ where: { id: role.id }, data: { key: 'admin' } })
  const tokens = []
  for (const user of users) {
    const result = await req('/auth/login', 'POST', { account: user.username, password: 'Isolated-Pdf-59!' })
    assert.equal(result.status, 200)
    tokens.push(result.body.data.token)
  }
  const [owner, other] = tokens
  const first = await req(
    '/resume',
    'POST',
    {
      name: '第一份',
      locale: 'zh-CN',
      document: { content: { sections: [{ type: 'profile', data: { name: '隔离简历' } }] } },
    },
    owner,
  )
  assert.equal(first.status, 201)
  const id = first.body.data.resume.id
  assert.deepEqual(first.body.data.document.display.pdf, defaultResumePdfConfig())
  const second = await req(
    '/resume',
    'POST',
    {
      name: '第二份',
      locale: 'zh-CN',
      document: { content: { sections: [{ type: 'profile', data: { name: '独立简历' } }] } },
    },
    owner,
  )
  const secondId = second.body.data.resume.id
  assert.equal((await req('/resume/pdf-preset', 'GET', null, owner)).body.data.config, null)
  const config = defaultResumePdfConfig()
  const initialConfig = first.body.data.document.display.pdf
  config.fields.interests = false
  config.header.enabled = true
  config.header.text = '隔离 slogan {page}/{pages}'
  assert.equal((await req(`/resume/${id}/pdf-config`)).status, 401)
  assert.equal((await req(`/resume/${id}/pdf-config`, 'GET', null, other)).status, 404)
  assert.equal((await req(`/resume/${id}/pdf-config`, 'PATCH', { config, expectedConfig: null }, other)).status, 404)
  const writes = await Promise.all(
    [0, 1].map(() => req(`/resume/${id}/pdf-config`, 'PATCH', { config, expectedConfig: initialConfig }, owner)),
  )
  assert.deepEqual(writes.map(x => x.status).sort(), [200, 409])
  assert.deepEqual((await req(`/resume/${id}/pdf-config`, 'GET', null, owner)).body.data.config, config)
  assert.deepEqual(
    (await req(`/resume/${secondId}/pdf-config`, 'GET', null, owner)).body.data.config,
    defaultResumePdfConfig(),
  )
  assert.equal((await req('/resume/pdf-preset', 'PATCH', { config, expectedConfig: null }, owner)).status, 200)
  assert.equal((await req('/resume/pdf-preset', 'GET', null, other)).body.data.config, null)
  const createInput = {
    name: '继承预设',
    locale: 'zh-CN',
    document: { content: { sections: [{ type: 'profile', data: { name: '新建测试' } }] } },
  }
  const inherited = await req('/resume', 'POST', createInput, owner)
  assert.equal(inherited.status, 201)
  const inheritedId = inherited.body.data.resume.id
  assert.deepEqual(inherited.body.data.document.display.pdf, config)
  const changedPreset = structuredClone(config)
  changedPreset.header.text = '后续预设'
  assert.equal(
    (await req('/resume/pdf-preset', 'PATCH', { config: changedPreset, expectedConfig: config }, owner)).status,
    200,
  )
  const afterChange = await req('/resume', 'POST', createInput, owner)
  assert.equal(afterChange.status, 201)
  assert.deepEqual(afterChange.body.data.document.display.pdf, changedPreset)
  assert.deepEqual((await req(`/resume/${inheritedId}/pdf-config`, 'GET', null, owner)).body.data.config, config)
  assert.deepEqual(
    (await req(`/resume/${secondId}/pdf-config`, 'GET', null, owner)).body.data.config,
    defaultResumePdfConfig(),
  )
  const copied = await req(
    '/resume',
    'POST',
    { ...createInput, name: '复制旧简历', document: inherited.body.data.document },
    owner,
  )
  assert.equal(copied.status, 201)
  assert.deepEqual(copied.body.data.document.display.pdf, config)
  const isolatedOwner = await req('/resume', 'POST', createInput, other)
  assert.equal(isolatedOwner.status, 201)
  assert.deepEqual(isolatedOwner.body.data.document.display.pdf, defaultResumePdfConfig())
  const draft = (await req(`/resume/${id}/draft`, 'GET', null, owner)).body.data
  // 旧客户端正文保存不应删除刚存的PDF配置。
  delete draft.document.display.pdf
  const save = await req(
    `/resume/${id}/draft`,
    'PUT',
    { expectedRevision: draft.revision, document: draft.document },
    owner,
  )
  assert.equal(save.status, 200)
  assert.deepEqual(save.body.data.document.display.pdf, config)
  // 网页外观保存也不应删除PDF配置。
  assert.equal((await req(`/resume/${id}/display`, 'PATCH', { display: draft.document.display }, owner)).status, 200)
  assert.deepEqual((await req(`/resume/${id}/pdf-config`, 'GET', null, owner)).body.data.config, config)
  const fresh = (await req(`/resume/${id}/draft`, 'GET', null, owner)).body.data
  const { createHash } = await import('node:crypto')
  const { canonicalResumeJson } = await import('@rs/common')
  const documentHash = createHash('sha256').update(canonicalResumeJson(fresh.document)).digest('hex')
  const temporary = { ...config, header: { ...config.header, text: '临时导出' } }
  const pdf = await req(`/resume/${id}/pdf`, 'POST', { source: 'draft', documentHash, pdfConfig: temporary }, owner)
  assert.equal(pdf.status, 200)
  assert.equal(pdf.pdf.subarray(0, 5).toString(), '%PDF-')
  assert.deepEqual((await req(`/resume/${id}/pdf-config`, 'GET', null, owner)).body.data.config, config)
  assert.equal(
    (
      await req(
        `/resume/${id}/pdf-config`,
        'PATCH',
        { config: { ...config, page: { ...config.page, marginTop: 200 } }, expectedConfig: config },
        owner,
      )
    ).status,
    400,
  )
  console.log(
    '隔离 HTTP/PG 验证通过：迁移、真实登录、本人持久化、他人404、未登录401、非法400、并发200/409、公共预设隔离、新建继承/系统默认、旧简历快照不联动、复制优先、正文/外观保存保留PDF、临时下载不写库。',
  )
} finally {
  await prisma.$disconnect()
}
