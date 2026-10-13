import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildResumeDocument,
  createResumeSchema,
  resumeDocumentSchema,
  resumeDraftInputSchema,
} from '../../dist/index.js'
import { resumeFixture } from '../fixtures/resume.mjs'

/**
 * 创建输入（稀疏）与默认补全。
 *
 * 契约见 docs/dev/07_简历系统_最小创建输入与默认补全.md。
 * 两条最不能破的边界：① 稀疏输入必须接受完整文档（超集），否则现有 web 客户端会 400；
 * ② 补全产物必须过 resumeDocumentSchema（含 superRefine 的跨字段规则）。
 */

/** 最小输入：只给姓名，其余全省。 */
const minimalInput = () => ({
  content: { sections: [{ type: 'profile', data: { name: '张三' } }] },
})

test('最小输入（仅姓名）可补全为合法完整文档，并补齐六类空模块', () => {
  const input = resumeDraftInputSchema.parse(minimalInput())
  const document = buildResumeDocument(input)

  assert.ok(resumeDocumentSchema.safeParse(document).success, '补全产物必须过完整文档校验')
  assert.equal(document.schemaVersion, 1)

  assert.deepEqual(
    document.content.sections.map(section => section.type),
    ['profile', 'highlights', 'education', 'experience', 'projects', 'capabilities', 'evaluations'],
  )

  // profile 的缺省字段被补齐，用户给的值保持不变
  const profile = document.content.sections[0]
  assert.equal(profile.data.name, '张三')
  assert.equal(profile.data.headline, '')
  assert.equal(profile.data.summary, '')
  assert.deepEqual(profile.data.hero, { frontImageUrl: '', backImageUrl: '', linkUrl: '', slogans: [] })
  assert.deepEqual(profile.data.infoItems, [])
  assert.equal(profile.title, '基本信息')
  assert.ok(profile.id.length > 0, 'id 应被生成')

  // ⚠️ order 必须完整覆盖所有模块（含刚补齐的六个），否则 superRefine 会失败
  assert.deepEqual(
    document.display.sections.order,
    document.content.sections.map(section => section.id),
  )
  assert.equal(document.display.layout.mode, 'single')
  assert.equal(document.display.style.id, 'minimal')
  assert.equal(document.display.options.showYears, true)
})

test('缺 profile、缺 profile.name、空 sections 分别报错', () => {
  // 空 sections
  assert.equal(resumeDraftInputSchema.safeParse({ content: { sections: [] } }).success, false)

  // 只给非 profile 模块 → 不恰有一个 profile
  const noProfile = resumeDraftInputSchema.safeParse({
    content: {
      sections: [
        {
          type: 'capabilities',
          id: 'ability',
          title: '个人能力',
          data: { groups: [], ratingScale: { min: 0, max: 5, basis: '' }, dimensions: [] },
        },
      ],
    },
  })
  assert.equal(noProfile.success, false)

  // 两个 profile → 同样不合法
  const twoProfiles = resumeDraftInputSchema.safeParse({
    content: {
      sections: [
        { type: 'profile', data: { name: 'A' } },
        { type: 'profile', data: { name: 'B' } },
      ],
    },
  })
  assert.equal(twoProfiles.success, false)

  // 缺 profile.name（name 是稀疏版里唯一必填的内容字段）
  assert.equal(
    resumeDraftInputSchema.safeParse({ content: { sections: [{ type: 'profile', data: {} }] } }).success,
    false,
  )
})

test('条目数组允许为空，且空模块的必填对象不能省的字段被正确补齐', () => {
  const input = resumeDraftInputSchema.parse({
    content: {
      sections: [
        {
          type: 'profile',
          data: { name: '李四', infoItems: [], links: [], interests: [], stats: [], gallery: [] },
        },
        { type: 'highlights', id: 'hl', title: '亮点', data: { items: [] } },
      ],
      footer: {},
    },
  })
  const document = buildResumeDocument(input)

  assert.ok(resumeDocumentSchema.safeParse(document).success)
  assert.equal(document.content.sections.find(section => section.type === 'highlights').data.items.length, 0)

  // capabilities 的 ratingScale 是必填对象，空模块也必须给全
  const capabilities = document.content.sections.find(section => section.type === 'capabilities')
  assert.deepEqual(capabilities.data, { groups: [], ratingScale: { min: 0, max: 5, basis: '' }, dimensions: [] })
})

test('给过的非 profile 模块被保留，不被空模块覆盖', () => {
  const input = resumeDraftInputSchema.parse({
    content: {
      sections: [
        { type: 'profile', data: { name: '王五' } },
        {
          type: 'experience',
          id: 'exp',
          title: '工作经历',
          data: {
            items: [
              {
                id: 'job1',
                company: '示例公司',
                date: { mode: 'custom', text: '2020-2023' },
                role: '前端',
                achievements: [],
                tech: [],
              },
            ],
          },
        },
      ],
    },
  })
  const document = buildResumeDocument(input)

  const experience = document.content.sections.filter(section => section.type === 'experience')
  assert.equal(experience.length, 1, '已给的 experience 不该再被补一个空的')
  assert.equal(experience[0].data.items[0].company, '示例公司')
})

test('完整文档输入被接受（超集），补全保留其 id 与 display，且再补全结果不变（幂等）', () => {
  const full = resumeFixture()

  // ① 旧 web 客户端发的就是这种（带 schemaVersion 的完整 document），必须仍能通过
  const parsed = resumeDraftInputSchema.safeParse(full)
  assert.equal(parsed.success, true, '完整文档必须能通过稀疏输入，否则现有创建链路会 400')

  // ② 补全保留原有 id 与展示配置（不重新生成，否则 order / overrides 的引用会被改掉）
  const first = buildResumeDocument(parsed.data)
  assert.equal(first.content.sections[0].id, full.content.sections[0].id)
  assert.equal(first.display.theme.id, full.display.theme.id)
  assert.deepEqual(first.display.sections.overrides, full.display.sections.overrides)
  assert.ok(resumeDocumentSchema.safeParse(first).success)

  // ③ 幂等：对已补全的文档再补全一次，结果不变
  const second = buildResumeDocument(resumeDraftInputSchema.parse(first))
  assert.deepEqual(second, first)
})

test('createResumeSchema 接受稀疏 document，并保持 name / locale 必填', () => {
  const ok = createResumeSchema.safeParse({ name: '我的简历', locale: 'zh', document: minimalInput() })
  assert.equal(ok.success, true)

  // 超集：旧的完整文档请求依然可用
  const stillOk = createResumeSchema.safeParse({ name: '旧客户端', locale: 'zh', document: resumeFixture() })
  assert.equal(stillOk.success, true)

  assert.equal(createResumeSchema.safeParse({ locale: 'zh', document: minimalInput() }).success, false)
  assert.equal(createResumeSchema.safeParse({ name: 'x', document: minimalInput() }).success, false)
  // schemaVersion 不接受 1 以外的值（服务端固定写 1）
  assert.equal(
    createResumeSchema.safeParse({
      name: 'x',
      locale: 'zh',
      document: { ...minimalInput(), schemaVersion: 2 },
    }).success,
    false,
  )
})
