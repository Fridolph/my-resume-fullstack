import assert from 'node:assert/strict'
import { test } from 'vitest'
import { buildResumeDocument, defaultResumePdfConfig, type ResumePdfConfig } from '@rs/common'
import type { AuthUser } from '../../common/http-context'
import { ResumeService } from '../resume.service'

const owner = {
  userId: 'print-owner',
  roleKeys: ['admin'],
  permissionKeys: ['Resume.Sections:edit'],
} as AuthUser

/** 只替换持久化边界，测试实际Service创建行为；不连接本机数据库。 */
function setup(preset: ResumePdfConfig | null) {
  let stored: unknown
  const transaction = {
    user: { findFirst: async () => ({ id: owner.userId }) },
    resumeWorkspace: {
      upsert: async (input: { where: { userId: string } }) => {
        assert.equal(input.where.userId, owner.userId)
        return { pdfConfig: preset }
      },
    },
    resume: {
      create: async (input: { data: { draft: { create: { document: unknown } } } }) => {
        stored = input.data.draft.create.document
        return { id: 1 }
      },
    },
    resumeDraft: {
      findUniqueOrThrow: async () => ({
        document: stored,
        revision: 1,
        updatedAt: new Date(),
        resume: { id: 1, name: '新简历', locale: 'zh-CN' },
      }),
    },
  }
  return new ResumeService(
    { $transaction: async (action: (tx: typeof transaction) => unknown) => action(transaction) } as never,
    { recordResumeCreation: async () => undefined } as never,
  )
}

const input = () => ({
  name: '新简历',
  locale: 'zh-CN',
  document: { content: { sections: [{ type: 'profile' as const, data: { name: '测试' } }] } },
})

test('没有公共预设时，新简历保存系统默认PDF快照', async () => {
  const result = await setup(null).create(input(), owner)
  assert.deepEqual(result.document.display.pdf, defaultResumePdfConfig())
})

test('新建继承本人预设，不携带实例ID且不共享可变对象', async () => {
  const preset = defaultResumePdfConfig()
  preset.fields.interests = false
  preset.header.enabled = true
  preset.header.text = '本人 slogan'
  preset.sections = { mode: 'independent', order: ['other-resume'], hidden: ['other-resume'] }
  const result = await setup(preset).create(input(), owner)
  assert.equal(result.document.display.pdf?.header.text, '本人 slogan')
  assert.equal(result.document.display.pdf?.fields.interests, false)
  assert.deepEqual(result.document.display.pdf?.sections, { mode: 'followWeb', order: [], hidden: [] })
  preset.header.text = '之后的新预设'
  assert.equal(result.document.display.pdf?.header.text, '本人 slogan')
})

test('复制或明确传入PDF配置时，优先保留来源配置与模块选择', async () => {
  const source = buildResumeDocument(input().document)
  const explicit = defaultResumePdfConfig()
  explicit.header.text = '来源简历'
  explicit.sections = {
    mode: 'independent',
    order: [...source.display.sections.order].reverse(),
    hidden: [source.display.sections.order[0]!],
  }
  source.display.pdf = explicit
  const preset = defaultResumePdfConfig()
  preset.header.text = '不应覆盖来源'
  const result = await setup(preset).create({ ...input(), document: source }, owner)
  assert.deepEqual(result.document.display.pdf, explicit)
})
