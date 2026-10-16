import assert from 'node:assert/strict'
import { test } from 'vitest'
import { ResumeService } from '../resume.service'
import type { CreateResumeDto, SaveResumeDraftDto } from '@rs/common'
import type { AuthUser } from '../../common/http-context'

/**
 * 迁移说明（`node:test` + CJS → vitest + TS）：
 *
 * 1. 旧写法是 `require('../../../dist/resume/resume.service.js')` —— **测试跑的是构建产物**，
 *    所以必须先 `pnpm build`，产物过期时测试还可能是绿的。现在直接 import 源码 `../resume.service`。
 * 2. 这些用例注入的是「极简 fake Prisma」：只实现被调用到的那几个方法，不连数据库；
 *    身份也只用 `userId` / `roleKeys` / `permissionKeys` 三个字段（`AuthUser` 还要求
 *    email、nickname、sessionVersion，与本用例无关）。
 *    因此下面的类型放宽**全部收在本文件内**，不用迁就 fake 去改 `resume.service.ts`
 *    或 `PrismaService` 的形状。
 */
type PrismaServiceDouble = ConstructorParameters<typeof ResumeService>[0]

/** fake 以对象字面量传入，形状由各用例自行保证；只在这一处收口到构造参数类型 */
function createService(fake: object): ResumeService {
  return new ResumeService(fake as unknown as PrismaServiceDouble)
}

test('编辑同时要求管理员角色和明确权限，拒绝发生在访问数据库之前', async () => {
  let databaseCalls = 0
  const service = createService({
    $transaction: () => {
      databaseCalls++
      throw new Error('Unexpected database access')
    },
  })
  // 权限判断在事务之外，所以 fake 不需要实现任何查询方法
  const identities = [
    { userId: 'reader', roleKeys: ['user'], permissionKeys: ['Resume.Sections:edit'] },
    { userId: 'admin', roleKeys: ['admin'], permissionKeys: [] },
    { userId: 'super', roleKeys: ['super_admin'], permissionKeys: [] },
  ] as unknown as AuthUser[]
  for (const identity of identities) {
    await assert.rejects(
      service.create({} as CreateResumeDto, identity),
      error => (error as { getStatus(): number }).getStatus() === 403,
    )
    await assert.rejects(
      service.saveDraft('draft' as unknown as number, {} as SaveResumeDraftDto, identity),
      error => (error as { getStatus(): number }).getStatus() === 403,
    )
  }
  assert.equal(databaseCalls, 0)
})

test('读取过滤所有权与账号可用性，超管也不能读他人草稿', async () => {
  let filter: any
  const service = createService({
    resumeDraft: {
      findFirst: async (input: any) => {
        filter = input.where
        return null
      },
    },
  })
  await assert.rejects(
    service.findDraft(
      'foreign' as unknown as number,
      {
        userId: 'super',
        roleKeys: ['super_admin'],
        permissionKeys: [],
      } as unknown as AuthUser,
    ),
    error => (error as { getStatus(): number }).getStatus() === 404,
  )
  assert.equal(filter.resume.workspaceUserId, 'super')
  assert.equal(filter.resume.id, 'foreign')
  // 简历本身没有软删字段（删除即物理删除，DAO-033）；只有账号仍用软删
  assert.equal(filter.resume.workspace.user.deletedAt, null)
})

test('条件更新失败返回冲突，停止后续写入', async () => {
  let laterWrites = 0
  const service = createService({
    $transaction: async (action: any) =>
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
      'draft' as unknown as number,
      { expectedRevision: 1, document: {} } as unknown as SaveResumeDraftDto,
      { userId: 'admin', roleKeys: ['admin'], permissionKeys: ['Resume.Sections:edit'] } as unknown as AuthUser,
    ),
    error => (error as { getStatus(): number }).getStatus() === 409,
  )
  assert.equal(laterWrites, 0)
})

test('删除走物理删除：deleteMany + 统一 404，且不写任何软删标记', async () => {
  const calls: any[] = []
  const service = createService({
    resume: {
      deleteMany: async (input: any) => {
        calls.push(input)
        return { count: 0 }
      },
    },
  })
  const editor = {
    userId: 'super',
    roleKeys: ['super_admin'],
    permissionKeys: ['Resume.Sections:edit'],
  } as unknown as AuthUser

  await assert.rejects(service.remove(7, editor), error => (error as { getStatus(): number }).getStatus() === 404)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].where.id, 7)
  assert.equal(calls[0].where.workspaceUserId, 'super')
  // 硬删只有一条 DELETE：没有 data.deletedAt 这种"打标记"的写法
  assert.equal('data' in calls[0], false)
})
