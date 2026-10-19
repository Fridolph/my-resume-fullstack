import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'vitest'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { defaultResumePdfConfig, buildResumeDocument, canonicalResumeJson, resumePdfExportSchema } from '@rs/common'
import { createResumePdfHtml, resumePdfBlocks } from '@rs/ui/pdf'
import { ResumePdfRenderer, ResumePdfService } from '../resume-pdf.service'
import type { ResumeService } from '../resume.service'
import type { AuthUser } from '../../common/http-context'
const user = { userId: 'owner' } as AuthUser
const document = () => buildResumeDocument({ content: { sections: [{ type: 'profile', data: { name: '测试简历' } }] } })

test('摘要忽略对象键顺序但保留数组顺序，导出拒绝未知输入', () => {
  assert.equal(canonicalResumeJson({ b: 2, a: 1 }), canonicalResumeJson({ a: 1, b: 2 }))
  assert.notEqual(canonicalResumeJson([1, 2]), canonicalResumeJson([2, 1]))
  assert.equal(
    resumePdfExportSchema.safeParse({ source: 'draft', documentHash: 'a'.repeat(64), url: 'http://localhost' }).success,
    false,
  )
})

test('导出复用本人/公开读取，未授权或摘要变化不启动渲染器', async () => {
  const doc = document()
  let renders = 0
  const calls: string[] = []
  const resumes = {
    findDraft: async (id: number, identity: AuthUser) => {
      assert.equal(identity, user)
      calls.push('draft')
      if (id !== 1) throw new NotFoundException()
      return { document: doc }
    },
    findPublished: async () => {
      calls.push('published')
      return { document: doc }
    },
  } as unknown as ResumeService
  const renderer = {
    render: async () => {
      renders++
      return Buffer.from('%PDF-')
    },
  } as unknown as ResumePdfRenderer
  const service = new ResumePdfService(resumes, renderer)
  const hash = createHash('sha256').update(canonicalResumeJson(doc)).digest('hex')
  await assert.rejects(service.export(2, { source: 'draft', documentHash: hash }, user), NotFoundException)
  await assert.rejects(service.export(1, { source: 'draft', documentHash: '0'.repeat(64) }, user), ConflictException)
  assert.equal(renders, 0)
  assert.equal((await service.export(1, { source: 'published', documentHash: hash }, user)).toString(), '%PDF-')
  doc.display.options.showEmail = false
  await assert.rejects(service.export(1, { source: 'draft', documentHash: hash }, user), ConflictException)
  assert.equal(renders, 1)
  assert.deepEqual(calls, ['draft', 'draft', 'published', 'draft'])
})

test('纸面承接排序、显隐、完整正文与安全富文本，不加载外部图片', () => {
  const doc = document()
  doc.content.sections.push({
    id: 'custom',
    type: 'custom',
    title: '自定义',
    data: {
      view: 'richText',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '<script>alert(1)</script>',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ],
      },
    },
  })
  doc.display.sections.order.unshift('custom')
  const blocks = resumePdfBlocks(doc)
  assert.equal(blocks[0]?.id, 'custom:title')
  assert.ok(blocks.some(block => block.html.includes('&lt;script&gt;')))
  assert.ok(!blocks.some(block => block.html.includes('javascript:')))
  doc.display.sections.hidden.push('custom')
  assert.ok(!createResumePdfHtml(doc).includes('&lt;script&gt;'))
  assert.ok(!createResumePdfHtml(doc).includes('<img'))
})

test('Renderer 拒绝超过两个并发任务，超时关闭 context 后允许重新生成', async () => {
  const { vi } = await import('vitest')
  vi.useFakeTimers()
  let closed = 0
  const renderer = new ResumePdfRenderer()
  // 引擎边界替身：挂起分页等待，以验证真正取消工作，而不让测试等待 30 秒。
  const context = {
    route: async () => undefined,
    newPage: async () => ({
      emulateMedia: async () => undefined,
      setContent: async () => undefined,
      waitForFunction: () => new Promise(() => undefined),
    }),
    close: async () => {
      closed++
    },
  }
  const browser = { newContext: async () => context }
  Object.defineProperty(renderer, 'getBrowser', { value: async () => browser })
  try {
    const first = renderer.render(document())
    const second = renderer.render(document())
    const checks = Promise.all([assert.rejects(first, /超时/), assert.rejects(second, /超时/)])
    await assert.rejects(renderer.render(document()), /繁忙/)
    await vi.advanceTimersByTimeAsync(30_001)
    await checks
    assert.ok(closed >= 2)
    const retry = renderer.render(document())
    const retryCheck = assert.rejects(retry, /超时/)
    await vi.advanceTimersByTimeAsync(30_001)
    await retryCheck
  } finally {
    vi.useRealTimers()
  }
})

test('姓名含闭合 script 不会逃逸受控脚本，未知富文本节点不生成继承属性标签', () => {
  const doc = document()
  const profile = doc.content.sections.find(section => section.type === 'profile')!
  profile.data.name = '</script><script>alert(1)</script>'
  const html = createResumePdfHtml(doc)
  assert.equal((html.match(/<script /g) ?? []).length, 1)
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1)
})

test('PDF 字段过滤和独立排序不受网页隐藏影响；页眉脚文本不逃逸', () => {
  const doc = document()
  const profile = doc.content.sections.find(section => section.type === 'profile')!
  profile.data.summary = '隐藏的个人简介'
  profile.data.interests = [{ id: 'interest', label: '隐藏的兴趣', images: [] }]
  doc.content.sections.push({
    id: 'extra',
    type: 'custom',
    title: '独立模块',
    description: '隐藏模块说明',
    data: { view: 'textList', items: [{ id: 'entry', text: '可见正文' }] },
  })
  doc.display.sections.hidden.push('extra')
  const config = defaultResumePdfConfig()
  config.sections = { mode: 'independent', order: ['extra'], hidden: [] }
  config.fields.interests = false
  config.fields.profileSummary = false
  config.fields.sectionDescriptions = false
  config.header = { ...config.header, enabled: true, text: '</script><script>boom</script>' }
  doc.display.pdf = config
  const html = createResumePdfHtml(doc)
  assert.ok(html.includes('可见正文'))
  assert.ok(!html.includes('隐藏的兴趣'))
  assert.ok(!html.includes('隐藏的个人简介'))
  assert.ok(!html.includes('隐藏模块说明'))
  assert.equal((html.match(/<script /g) ?? []).length, 1)
  assert.equal(resumePdfBlocks(doc)[0]?.id, 'extra:title')
})
