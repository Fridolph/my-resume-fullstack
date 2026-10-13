import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { resumeDocumentSchema, resumeDraftInputSchema } from '@rs/common'

const spec = JSON.parse(readFileSync(new URL('../../../docs/server/openapi.json', import.meta.url), 'utf8'))
const ref = name => ({ $ref: `#/components/schemas/${name}` })
const responseRef = name => ({ $ref: `#/components/responses/${name}` })
const jsonContent = schema => ({ 'application/json': { schema } })
const documentSchema = z.toJSONSchema(resumeDocumentSchema, { target: 'openapi-3.0' })
documentSchema.description =
  '完整 V1 简历；UTF-8 JSON 不超过 100 KiB。ID 全局唯一，恰有一份 profile，order 完整无重复；显隐、栏位、能力组与图表维度引用必须有效。跨字段约束由运行时 Zod 进一步校验。'
spec.components.schemas.ResumeDocument = documentSchema
const draftInputSchema = z.toJSONSchema(resumeDraftInputSchema, { target: 'openapi-3.0' })
draftInputSchema.description =
  '创建输入的稀疏文档：content.sections 至少 1 项且恰含一个 profile 模块，display 可整体省略；' +
  '服务端补全缺失字段与六类空模块，并固定写入 schemaVersion=1（输入里的同名值被忽略）。' +
  '该形状是完整文档的超集，旧客户端提交完整文档同样兼容。'
spec.components.schemas.ResumeDraftInput = draftInputSchema
spec.components.schemas.CreateResume = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'locale', 'document'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 80 },
    locale: { type: 'string', minLength: 1, maxLength: 20, pattern: '^[A-Za-z0-9-]+$' },
    document: ref('ResumeDraftInput'),
  },
}
spec.components.schemas.SaveResumeDraft = {
  type: 'object',
  additionalProperties: false,
  required: ['expectedRevision', 'document'],
  properties: {
    expectedRevision: { type: 'integer', minimum: 1, maximum: 2147483646 },
    document: ref('ResumeDocument'),
  },
}
spec.components.schemas.ResumeDraft = {
  type: 'object',
  required: ['resume', 'revision', 'updatedAt', 'document'],
  properties: {
    resume: {
      type: 'object',
      required: ['id', 'name', 'locale'],
      properties: { id: { type: 'string' }, name: { type: 'string' }, locale: { type: 'string' } },
    },
    revision: { type: 'integer', minimum: 1 },
    updatedAt: { type: 'string', format: 'date-time' },
    document: ref('ResumeDocument'),
  },
}
spec.components.responses.ResumeDraftSuccess = {
  description: '本人草稿与服务端 revision',
  content: jsonContent({ allOf: [ref('ApiSuccess'), { type: 'object', properties: { data: ref('ResumeDraft') } }] }),
}
for (const [name, code, errorCode, description] of [
  ['ResumeForbidden', 403, 'Resume.Draft:editForbidden', '需 admin/super_admin 角色及 Resume.Sections:edit 权限'],
  ['ResumeNotFound', 404, 'Resume.Draft:notFound', '他人、已删除或不存在的简历统一返回 404'],
  ['ResumeDraftConflict', 409, 'Resume.Draft:conflict', 'revision 已变化；保留输入并备份后主动重新读取'],
])
  spec.components.responses[name] = {
    description,
    content: {
      'application/json': { schema: ref('ApiError'), example: { code, data: null, errorCode, message: description } },
    },
  }
const errors = { 400: responseRef('ValidationError'), 401: responseRef('UnauthorizedError') }
spec.tags = [
  ...spec.tags.filter(tag => tag.name !== 'Resume'),
  { name: 'Resume', description: '本人完整简历草稿；发布与分享另行实现' },
]
spec.paths['/resume'] = {
  post: {
    tags: ['Resume'],
    summary: '创建本人简历及唯一草稿',
    operationId: 'createResume',
    requestBody: { required: true, content: jsonContent(ref('CreateResume')) },
    responses: { 201: responseRef('ResumeDraftSuccess'), ...errors, 403: responseRef('ResumeForbidden') },
  },
}
spec.paths['/resume/{id}/draft'] = {
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9_-]+$' },
    },
  ],
  get: {
    tags: ['Resume'],
    summary: '读取本人完整草稿',
    operationId: 'getResumeDraft',
    responses: {
      200: responseRef('ResumeDraftSuccess'),
      401: responseRef('UnauthorizedError'),
      404: responseRef('ResumeNotFound'),
    },
  },
  put: {
    tags: ['Resume'],
    summary: '按 revision 原子保存本人草稿',
    operationId: 'saveResumeDraft',
    requestBody: { required: true, content: jsonContent(ref('SaveResumeDraft')) },
    responses: {
      200: responseRef('ResumeDraftSuccess'),
      ...errors,
      403: responseRef('ResumeForbidden'),
      404: responseRef('ResumeNotFound'),
      409: responseRef('ResumeDraftConflict'),
    },
  },
}
process.stdout.write(JSON.stringify(spec, null, 2) + '\n')
