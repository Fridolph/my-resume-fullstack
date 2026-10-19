import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  buildResumeDocument,
  defaultResumePdfConfig,
  resumeDocumentSchema,
  resumePdfConfigSchema,
  resumePdfExportSchema,
  toResumePdfPreset,
  pdfConfigReferencesValid,
} from '../../src/index'

test('历史文档不要求pdf；默认对象互相独立，显隐配置不删除内容', () => {
  const doc = buildResumeDocument({ content: { sections: [{ type: 'profile', data: { name: '测试' } }] } })
  assert.equal(resumeDocumentSchema.parse(doc).display.pdf, undefined)
  const config = defaultResumePdfConfig()
  config.fields.interests = false
  assert.equal(defaultResumePdfConfig().fields.interests, true)
  const next = resumeDocumentSchema.parse({ ...doc, display: { ...doc.display, pdf: config } })
  assert.deepEqual(next.content, doc.content)
})

test('拒绝不受控的排版数值、颜色、HTML字段与重复ID', () => {
  const original = defaultResumePdfConfig()
  for (const patch of [
    { page: { ...original.page, marginLeft: -1 } },
    { typography: { ...original.typography, fontSize: 50 } },
    { typography: { ...original.typography, primaryColor: 'red;position:absolute' } },
    { sections: { mode: 'independent', order: ['a', 'a'], hidden: [] } },
    { header: { ...original.header, text: '换\n行' } },
    { arbitraryCss: 'body{}' },
  ])
    assert.equal(resumePdfConfigSchema.safeParse({ ...original, ...patch }).success, false)
  assert.equal(
    resumePdfExportSchema.safeParse({ source: 'draft', documentHash: 'a'.repeat(64), pdfConfig: original }).success,
    true,
  )
})

test('公共预设剔除实例ID；保存与导出必须验证目标模块', () => {
  const config = defaultResumePdfConfig()
  config.sections = { mode: 'independent', order: ['one'], hidden: ['two'] }
  const preset = toResumePdfPreset(config)
  assert.deepEqual(preset.sections, { mode: 'followWeb', order: [], hidden: [] })
  assert.equal(config.sections.order[0], 'one')
  assert.equal(pdfConfigReferencesValid(config, ['one']), false)
  assert.equal(pdfConfigReferencesValid(config, ['one', 'two']), true)
})

test('完整文档复制创建时保留PDF配置，不能归一补全时丢失', () => {
  const original = buildResumeDocument({ content: { sections: [{ type: 'profile', data: { name: '原文档' } }] } })
  original.display.pdf = defaultResumePdfConfig()
  original.display.pdf.header.text = '复制 slogan'
  const copy = buildResumeDocument(original)
  assert.deepEqual(copy.display.pdf, original.display.pdf)
})
