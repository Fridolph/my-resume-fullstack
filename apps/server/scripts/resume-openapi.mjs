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
      properties: { id: { type: 'integer' }, name: { type: 'string' }, locale: { type: 'string' } },
    },
    revision: { type: 'integer', minimum: 1 },
    updatedAt: { type: 'string', format: 'date-time' },
    document: ref('ResumeDocument'),
  },
}
spec.components.schemas.ResumeSummary = {
  type: 'object',
  description: '列表项：不含正文；revision 与 updatedAt 取自该简历的当前草稿。',
  required: ['id', 'name', 'locale', 'revision', 'updatedAt'],
  properties: {
    id: { type: 'integer', minimum: 1 },
    name: { type: 'string', minLength: 1, maxLength: 80 },
    locale: { type: 'string', minLength: 1, maxLength: 20, pattern: '^[A-Za-z0-9-]+$' },
    revision: { type: 'integer', minimum: 1 },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}
spec.components.schemas.RenameResume = {
  type: 'object',
  description: '只收 name：id / locale / document 各有各的接口，混进同一个 PATCH 会让改名变成一次隐式的整体覆盖。',
  additionalProperties: false,
  required: ['name'],
  properties: { name: { type: 'string', minLength: 1, maxLength: 80 } },
}
spec.components.schemas.ResumeRenamed = {
  type: 'object',
  required: ['id', 'name'],
  properties: { id: { type: 'integer' }, name: { type: 'string' } },
}
spec.components.schemas.ResumeDeleted = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer' } },
}
spec.components.responses.ResumeDraftSuccess = {
  description: '本人草稿与服务端 revision',
  content: jsonContent({ allOf: [ref('ApiSuccess'), { type: 'object', properties: { data: ref('ResumeDraft') } }] }),
}
spec.components.responses.ResumeSummaryListSuccess = {
  description: '本人未删除的简历列表（按创建时间倒序，不含正文）',
  content: jsonContent({
    allOf: [
      ref('ApiSuccess'),
      { type: 'object', properties: { data: { type: 'array', items: ref('ResumeSummary') } } },
    ],
  }),
}
spec.components.responses.ResumeRenamedSuccess = {
  description: '重命名后的简历主键与名称',
  content: jsonContent({ allOf: [ref('ApiSuccess'), { type: 'object', properties: { data: ref('ResumeRenamed') } }] }),
}
spec.components.responses.ResumeDeletedSuccess = {
  description: '已删除的简历主键（重复删除返回 404，不静默成功）',
  content: jsonContent({ allOf: [ref('ApiSuccess'), { type: 'object', properties: { data: ref('ResumeDeleted') } }] }),
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
/** `/resume/{id}` 系列共用的路径参数。URL 天然是字符串，服务端按「纯数字字符串」校验后转成整数。 */
const resumeIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1, maximum: 2147483647 },
}
spec.tags = [
  ...spec.tags.filter(tag => tag.name !== 'Resume'),
  {
    name: 'Resume',
    description: '本人简历的列表、草稿读写、重命名与删除；另有 `/resume/public*` 为访客可读的公开内容',
  },
]
spec.paths['/resume'] = {
  get: {
    tags: ['Resume'],
    summary: '列出本人未删除的简历',
    operationId: 'listResumes',
    responses: {
      200: responseRef('ResumeSummaryListSuccess'),
      401: responseRef('UnauthorizedError'),
    },
  },
  post: {
    tags: ['Resume'],
    summary: '创建本人简历及唯一草稿',
    operationId: 'createResume',
    requestBody: { required: true, content: jsonContent(ref('CreateResume')) },
    responses: { 201: responseRef('ResumeDraftSuccess'), ...errors, 403: responseRef('ResumeForbidden') },
  },
}
/**
 * 公开读取（**无需 token**）。
 *
 * ⚠️ 文档里的 `security: []` 是显式声明"匿名可访问"：本项目默认全局鉴权，只有 `@Public()`
 * 路由才放开，所以在文档上标出来，避免读者以为漏写了 401。
 */
spec.paths['/resume/public'] = {
  get: {
    tags: ['Resume'],
    summary: '公开读取「默认展示」的简历（首页 / 的数据源，匿名可读）',
    description:
      '作者标为「默认展示」（★）的那一份。尚未设置默认时返回 404 —— 刻意不隐式挑一份（否则"展示哪一份"不可预期）。',
    operationId: 'getPublishedDefaultResume',
    security: [],
    responses: {
      200: responseRef('ResumeDraftSuccess'),
      404: responseRef('ResumeNotFound'),
    },
  },
}
spec.paths['/resume/public/{id}'] = {
  parameters: [resumeIdParam],
  get: {
    tags: ['Resume'],
    summary: '公开读取指定 id 的简历（/resume/:id 的数据源，匿名可读）',
    description:
      '只按「账号是否仍然有效」过滤，不做所有权校验 —— 这正是公开的含义。\n\n⚠️ 本轮没有「已发布」字段：只要 id 已知，任何简历（含半成品）都能被读到。',
    operationId: 'getPublishedResume',
    security: [],
    responses: {
      200: responseRef('ResumeDraftSuccess'),
      404: responseRef('ResumeNotFound'),
    },
  },
}
spec.paths['/resume/{id}/draft'] = {
  parameters: [resumeIdParam],
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
spec.paths['/resume/{id}'] = {
  parameters: [resumeIdParam],
  patch: {
    tags: ['Resume'],
    summary: '重命名本人简历（只改内部名称，不动正文）',
    operationId: 'renameResume',
    requestBody: { required: true, content: jsonContent(ref('RenameResume')) },
    responses: {
      200: responseRef('ResumeRenamedSuccess'),
      ...errors,
      403: responseRef('ResumeForbidden'),
      404: responseRef('ResumeNotFound'),
    },
  },
  delete: {
    tags: ['Resume'],
    summary: '删除本人简历（重复删除返回 404）',
    operationId: 'deleteResume',
    responses: {
      200: responseRef('ResumeDeletedSuccess'),
      ...errors,
      403: responseRef('ResumeForbidden'),
      404: responseRef('ResumeNotFound'),
    },
  },
}
process.stdout.write(JSON.stringify(spec, null, 2) + '\n')
