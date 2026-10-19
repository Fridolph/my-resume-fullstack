import { test } from 'vitest'
import assert from 'node:assert/strict'
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { buildResumeDocument, defaultResumePdfConfig } from '@rs/common'
import { ResumePdfConfigService } from '../resume-pdf-config.service'
import type { AuthUser } from '../../common/http-context'
const user = { userId: 'owner', permissionKeys: ['Resume.Display:edit'] } as AuthUser
const doc = () => buildResumeDocument({ content: { sections: [{ type: 'profile', data: { name: '测试' } }] } })
function service(tx: object) {
  return new ResumePdfConfigService({
    ...tx,
    $transaction: async (action: (tx: object) => unknown) => action(tx),
  } as never)
}

test('无权限先拒绝，查询本人以外简历返回404', async () => {
  const api = service({ resumeDraft: { findFirst: async () => null } })
  await assert.rejects(
    api.saveConfig(1, { config: defaultResumePdfConfig(), expectedConfig: null }, { ...user, permissionKeys: [] }),
    ForbiddenException,
  )
  await assert.rejects(api.getConfig(1, user), NotFoundException)
})
test('保存仅改pdf，CAS包含完整旧JSON，正文revision不变，引用非法拒绝', async () => {
  const document = doc()
  let write: any
  const api = service({
    resumeDraft: {
      findFirst: async (args: any) => {
        assert.equal(args.where.resume.workspaceUserId, user.userId)
        return { id: 3, document }
      },
      updateMany: async (args: any) => {
        write = args
        return { count: 1 }
      },
    },
  })
  const config = defaultResumePdfConfig()
  config.fields.interests = false
  await api.saveConfig(1, { config, expectedConfig: null }, user)
  assert.deepEqual(write.data.document.content, document.content)
  assert.deepEqual(write.where.document.equals, document)
  assert.equal('revision' in write.data, false)
  assert.equal(write.data.document.display.pdf.fields.interests, false)
  config.sections.hidden = ['missing']
  await assert.rejects(api.saveConfig(1, { config, expectedConfig: null }, user), BadRequestException)
})
test('配置版本变化或正文并发变化都返回409', async () => {
  const document = doc()
  const api = service({
    resumeDraft: { findFirst: async () => ({ id: 1, document }), updateMany: async () => ({ count: 0 }) },
  })
  const config = defaultResumePdfConfig()
  await assert.rejects(api.saveConfig(1, { config, expectedConfig: config }, user), ConflictException)
  await assert.rejects(api.saveConfig(1, { config, expectedConfig: null }, user), ConflictException)
})
test('公共预设只写本人工作区，不携带模块ID，不联动任何简历', async () => {
  let write: any
  const api = service({
    resumeWorkspace: {
      upsert: async () => undefined,
      updateMany: async (args: any) => {
        write = args
        return { count: 1 }
      },
    },
  })
  const config = defaultResumePdfConfig()
  config.sections.hidden = ['private-id']
  const result = await api.savePreset({ config, expectedConfig: null }, user)
  assert.equal(write.where.userId, user.userId)
  assert.deepEqual(result.config?.sections.hidden, [])
})
