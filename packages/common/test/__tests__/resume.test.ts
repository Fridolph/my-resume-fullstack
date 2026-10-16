import { test } from 'vitest'
import assert from 'node:assert/strict'
// 直接指向源码入口：测试不再依赖 dist 构建产物，未构建也能跑
import {
  resumeDocumentSchema,
  resumeDateSchema,
  changeCapabilityScale,
  saveResumeDraftSchema,
  resumeIdSchema,
} from '../../src/index.js'
import { resumeFixture } from '../fixtures/resume.js'

test('简历 ID 兼容 cuid 与 UUID，仍拒绝过长或不合法的标识', () => {
  assert.ok(resumeIdSchema.safeParse('cmabcdefghijklmnopqrstuvw').success)
  assert.ok(resumeIdSchema.safeParse('7b486e65-e819-4fca-8a13-9353e7bc1234').success)
  assert.ok(resumeIdSchema.safeParse('a'.repeat(100)).success)
  assert.equal(resumeIdSchema.safeParse('a'.repeat(101)).success, false)
  assert.equal(resumeIdSchema.safeParse('').success, false)
  assert.equal(resumeIdSchema.safeParse('invalid/id').success, false)
})

test('UUID 生成的能力分组、条目、维度和展示引用可保存完整文档', () => {
  const document = resumeFixture()
  const data = document.content.sections[1].data
  data.groups[0].id = '7b486e65-e819-4fca-8a13-9353e7bc1234'
  data.groups[0].items[0].id = 'd7e784ca-64db-4d6a-b7bb-ec0869dc5678'
  data.dimensions[0].id = 'ce39980c-d929-4369-931a-501242b89012'
  data.dimensions[0].groupId = data.groups[0].id
  document.display.sections.overrides.ability.capabilities.dimensionIds = [data.dimensions[0].id]
  assert.ok(resumeDocumentSchema.safeParse(document).success)
})

test('通用职业分组、未评分及有效零分均完整承接', () => {
  const document = resumeFixture()
  assert.equal(resumeDocumentSchema.parse(document).content.sections[1].data.dimensions[0].score, null)
  document.content.sections[1].data.dimensions[0].score = 0
  assert.equal(resumeDocumentSchema.parse(document).content.sections[1].data.dimensions[0].score, 0)
})

for (const [name, change] of [
  [
    '重复内容 ID',
    document => {
      document.content.sections[1].data.groups[0].items[0].id = 'profile'
    },
  ],
  [
    '缺失模块顺序',
    document => {
      document.display.sections.order.pop()
    },
  ],
  [
    '未知显隐引用',
    document => {
      document.display.sections.hidden.push('unknown')
    },
  ],
  [
    '跨模块评分引用',
    document => {
      document.display.sections.overrides.ability.capabilities.dimensionIds = ['unknown']
    },
  ],
  [
    '无效分组引用',
    document => {
      document.content.sections[1].data.dimensions[0].groupId = 'unknown'
    },
  ],
  [
    '超量尺评分',
    document => {
      document.content.sections[1].data.dimensions[0].score = 6
    },
  ],
  [
    '负数评分',
    document => {
      document.content.sections[1].data.dimensions[0].score = -1
    },
  ],
  [
    '脚本链接',
    document => {
      document.content.sections[1].data.groups[0].items[0].evidenceLinks = [
        { id: 'link', label: '链接', url: 'javascript:alert(1)' },
      ]
    },
  ],
  [
    '未声明字段',
    document => {
      document.content.ownerId = 'attacker'
    },
  ],
  [
    '缺失基本信息',
    document => {
      document.content.sections.shift()
    },
  ],
])
  test(`拒绝${name}`, () => {
    const document = resumeFixture()
    change(document)
    assert.equal(resumeDocumentSchema.safeParse(document).success, false)
  })

test('换量尺显式换算或清空，不把未评分当零', () => {
  const data = resumeFixture().content.sections[1].data
  data.dimensions.push({ id: 'rated', label: '已评分', score: 3 })
  const converted = changeCapabilityScale(data, 100, 'convert')
  assert.equal(converted.dimensions[0].score, null)
  assert.equal(converted.dimensions[1].score, 60)
  assert.ok(changeCapabilityScale(data, 10, 'clear').dimensions.every(item => item.score === null))
  assert.equal(data.ratingScale.max, 5)
})

test('日期模式有独立语义与明确边界', () => {
  assert.ok(resumeDateSchema.safeParse({ mode: 'custom', text: '2024年至今' }).success)
  assert.ok(resumeDateSchema.safeParse({ mode: 'structured', start: '2024-01', end: null, isCurrent: true }).success)
  assert.equal(
    resumeDateSchema.safeParse({ mode: 'structured', start: '2024-02', end: '2024-01', isCurrent: false }).success,
    false,
  )
  assert.equal(
    resumeDateSchema.safeParse({ mode: 'structured', start: '2024-13', end: null, isCurrent: true }).success,
    false,
  )
})

test('完整文档限制 UTF-8 字节大小，revision 要求正整数', () => {
  const document = resumeFixture()
  document.content.sections[1].data.groups = Array.from({ length: 20 }, (_, groupIndex) => ({
    id: `group-${groupIndex}`,
    title: '分组',
    items: Array.from({ length: 50 }, (_, itemIndex) => ({
      id: `item-${groupIndex}-${itemIndex}`,
      name: '能力',
      description: '能力'.repeat(100),
      evidenceLinks: [],
    })),
  }))
  document.content.sections[1].data.dimensions = []
  document.display.sections.overrides.ability.capabilities.dimensionIds = []
  assert.equal(resumeDocumentSchema.safeParse(document).success, false)
  assert.equal(saveResumeDraftSchema.safeParse({ expectedRevision: 0, document: resumeFixture() }).success, false)
})
