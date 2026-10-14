const test = require('node:test')
const assert = require('node:assert/strict')
const { ResumeService } = require('../../../dist/resume/resume.service.js')

test('编辑同时要求管理员角色和明确权限，拒绝发生在访问数据库之前', async () => {
  let databaseCalls = 0
  const service = new ResumeService({
    $transaction: () => {
      databaseCalls++
      throw new Error('Unexpected database access')
    },
  })
  for (const identity of [
    { userId: 'reader', roleKeys: ['user'], permissionKeys: ['Resume.Sections:edit'] },
    { userId: 'admin', roleKeys: ['admin'], permissionKeys: [] },
    { userId: 'super', roleKeys: ['super_admin'], permissionKeys: [] },
  ]) {
    await assert.rejects(service.create({}, identity), error => error.getStatus() === 403)
    await assert.rejects(service.saveDraft('draft', {}, identity), error => error.getStatus() === 403)
  }
  assert.equal(databaseCalls, 0)
})

test('读取过滤所有权和软删除，超管也不能读他人草稿', async () => {
  let filter
  const service = new ResumeService({
    resumeDraft: {
      findFirst: async input => {
        filter = input.where
        return null
      },
    },
  })
  await assert.rejects(
    service.findDraft('foreign', { userId: 'super', roleKeys: ['super_admin'], permissionKeys: [] }),
    error => error.getStatus() === 404,
  )
  assert.equal(filter.resume.workspaceUserId, 'super')
  assert.equal(filter.resume.id, 'foreign')
  assert.equal(filter.resume.deletedAt, null)
  assert.equal(filter.resume.workspace.user.deletedAt, null)
})

test('条件更新失败返回冲突，停止后续写入', async () => {
  let laterWrites = 0
  const service = new ResumeService({
    $transaction: async action =>
      action({
        resume: {
          findFirst: async () => ({ id: 'draft' }),
          update: async () => {
            laterWrites++
          },
        },
        resumeDraft: {
          updateMany: async () => ({ count: 0 }),
          findUniqueOrThrow: async () => {
            laterWrites++
          },
        },
      }),
  })
  await assert.rejects(
    service.saveDraft(
      'draft',
      { expectedRevision: 1, document: {} },
      { userId: 'admin', roleKeys: ['admin'], permissionKeys: ['Resume.Sections:edit'] },
    ),
    error => error.getStatus() === 409,
  )
  assert.equal(laterWrites, 0)
})
