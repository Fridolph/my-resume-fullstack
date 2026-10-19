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
type AuditServiceDouble = ConstructorParameters<typeof ResumeService>[1]

/** 审计写入的调用记录（多用例会断言"真的写了审计"） */
const auditRecords: unknown[] = []

/**
 * fake 以对象字面量传入，形状由各用例自行保证；只在这一处收口到构造参数类型。
 *
 * 第二个参数是 `AuditService` 的替身：**只实现 `record`**（这些用例不涉及查询），
 * 并把每次调用收进 `auditRecords` 供断言 —— 这样"删简历时确实写了审计"
 * 是可验证的，而不是靠读代码相信。
 */
function createService(fake: object): ResumeService {
  auditRecords.length = 0
  const auditService = {
    // 记录"调了哪个方法"
    record: async (...args: unknown[]) => {
      auditRecords.push(['record', ...args])
    },
    recordResumeDeletion: async (...args: unknown[]) => {
      auditRecords.push(['recordResumeDeletion', ...args])
    },
    recordResumeSetDefault: async (...args: unknown[]) => {
      auditRecords.push(['recordResumeSetDefault', ...args])
    },
    recordResumeSetPublished: async (...args: unknown[]) => {
      auditRecords.push(['recordResumeSetPublished', ...args])
    },
  }
  return new ResumeService(fake as unknown as PrismaServiceDouble, auditService as unknown as AuditServiceDouble)
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

test('删除走物理删除：先读快照 → deleteMany → **同一事务内**写审计', async () => {
  const calls: any[] = []
  const tx = {
    resume: {
      // 快照必须在删除**之前**取；这里给出"一份 3 模块、已设为默认"的简历
      findFirst: async () => ({
        id: 7,
        name: '我的求职简历',
        isDefault: true,
        draft: { revision: 9, document: { content: { sections: [{}, {}, {}] } } },
      }),
      deleteMany: async (input: any) => {
        calls.push(input)
        return { count: 1 }
      },
    },
  }
  const service = createService({ $transaction: async (action: any) => action(tx) })
  const editor = {
    userId: 'super',
    roleKeys: ['super_admin'],
    permissionKeys: ['Resume.Sections:edit'],
  } as unknown as AuthUser

  await service.remove(7, editor, { requestId: 'req-abc' })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].where.id, 7)
  assert.equal(calls[0].where.workspaceUserId, 'super')
  // 硬删只有一条 DELETE：没有 data.deletedAt 这种"打标记"的写法
  assert.equal('data' in calls[0], false)

  assert.equal(auditRecords.length, 1, '删除必须留下审计')
  // 断言的是**语义方法**的契约；"helper → record 的字段映射"由 audit.service.test.ts 覆盖
  const [method, txArg, , input] = auditRecords[0] as [string, unknown, AuthUser, any]
  assert.equal(method, 'recordResumeDeletion')
  assert.equal(txArg, tx, '必须复用业务事务客户端，而不是另开连接 —— 否则强一致不成立')
  assert.equal(input.resumeId, 7)
  assert.equal(input.name, '我的求职简历')
  assert.equal(input.requestId, 'req-abc')
  // 这三个字段回答的是"删掉的是一份已完成的简历，还是一个空壳"
  assert.equal(input.revision, 9)
  assert.equal(input.sectionCount, 3)
  assert.equal(input.wasDefault, true)
})

test('删除：快照读不到就不删、也不写审计（统一 404）', async () => {
  const calls: any[] = []
  const tx = {
    resume: {
      findFirst: async () => null,
      deleteMany: async (input: any) => {
        calls.push(input)
        return { count: 0 }
      },
    },
  }
  const service = createService({ $transaction: async (action: any) => action(tx) })
  const editor = {
    userId: 'super',
    roleKeys: ['super_admin'],
    permissionKeys: ['Resume.Sections:edit'],
  } as unknown as AuthUser

  await assert.rejects(service.remove(7, editor), error => (error as { getStatus(): number }).getStatus() === 404)
  assert.equal(calls.length, 0, '读不到就不该执行 DELETE')
  assert.equal(auditRecords.length, 0, '没有发生删除，就不该有审计记录')
})

/**
 * 列表分页的两条不变量（都属于"错了不会报错、只在跨页时才显形"的那类）：
 * 1. `count` 与 `findMany` 必须用**同一个 where**，否则"共 N 条"与实际能翻到的条数对不上；
 * 2. `skip` 由页码推出、`take` 是每页条数，且越界值被收敛（不回显会让页码与实际请求脱节）。
 */
test('list：分页参数推出 skip/take，count 与 findMany 共用一个 where', async () => {
  const findManyArgs: { where: unknown; skip?: number; take?: number; orderBy?: unknown }[] = []
  const countWheres: unknown[] = []
  const prismaService = {
    resume: {
      findMany: async (args: { where: unknown; skip?: number; take?: number; orderBy?: unknown }) => {
        findManyArgs.push(args)
        return []
      },
      count: async (args: { where: unknown }) => {
        countWheres.push(args.where)
        return 0
      },
    },
    // 服务里用的是数组形式 $transaction([findMany, count])
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  }

  const service = createService(prismaService)
  const identity = {
    userId: 'u-1',
    roleKeys: ['admin'],
    permissionKeys: ['Resume.Sections:edit'],
  } as unknown as AuthUser

  const result = await service.list(identity, { page: 3, pageSize: 10 })

  assert.equal(findManyArgs[0]?.skip, 20, '第 3 页应跳过 20 条')
  assert.equal(findManyArgs[0]?.take, 10)
  assert.deepEqual(countWheres[0], findManyArgs[0]?.where, 'count 的 where 必须与列表一致')
  // 次级排序键保证同时间戳的行在两页里不会重复出现
  assert.deepEqual(findManyArgs[0]?.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }])
  assert.deepEqual(result, { items: [], total: 0, page: 3, pageSize: 10 })
})

test('list：越界的分页参数被收敛，并回显生效值', async () => {
  const prismaService = {
    resume: {
      findMany: async () => [],
      count: async () => 0,
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  }
  const service = createService(prismaService)
  const identity = { userId: 'u-1', roleKeys: ['admin'], permissionKeys: [] } as unknown as AuthUser

  assert.deepEqual(await service.list(identity, { page: 0, pageSize: 100000 }), {
    items: [],
    total: 0,
    page: 1,
    pageSize: 100,
  })
})

/**
 * B1（发布态）的三条契约。
 *
 * 这些断言都落在**收口点**上，而不是某个接口的返回值：发布态加在唯一收口点
 * `publishedResume()` 里，所以这里钉住"where 的形状"；接口层的真实行为
 * （未发布 404 / 发布 200）要靠隔离环境的真实请求验。
 */

test('两个公开读的 where 都带发布态过滤（未发布读不到）', async () => {
  const wheres: Array<Record<string, unknown>> = []
  const service = createService({
    resumeDraft: {
      // 返回 null 就够了：SQL 没跑到，但 where 已经被记下来；同时也会抛 404
      findFirst: async (args: { where: Record<string, unknown> }) => {
        wheres.push(args.where)
        return null
      },
    },
  })

  await assert.rejects(() => service.findPublished(1))
  await assert.rejects(() => service.findPublishedDefault())

  assert.equal(wheres.length, 2)
  for (const where of wheres) {
    assert.deepEqual((where.resume as Record<string, unknown>).publishedAt, { not: null })
  }
})

test('发布写时间戳；取消发布置 null，且命中默认那份时连带取消默认', async () => {
  const updates: Array<Record<string, unknown>> = []
  const tx = {
    resume: {
      // 未发布但仍是默认 —— 正是"取消发布要连带清默认"的场景
      findFirst: async () => ({ id: 7, name: '测试简历', publishedAt: null, isDefault: true }),
      update: async (args: { data: Record<string, unknown> }) => {
        updates.push(args.data)
        return { id: 7, publishedAt: args.data.publishedAt ?? null }
      },
    },
  }
  const service = createService({ $transaction: async (action: (t: unknown) => unknown) => action(tx) })
  const admin = {
    userId: 'u-1',
    roleKeys: ['admin'],
    permissionKeys: ['Resume.Sections:edit'],
  } as unknown as AuthUser

  const published = await service.setPublished(7, true, admin)
  assert.ok(updates[0].publishedAt instanceof Date, '发布应写入当前时间')
  assert.equal(typeof published.publishedAt, 'string')

  // 审计必须写：覆盖率测试只能证明"某处引用了常量"，证明"确实调用"要靠这里
  const publishAudit = auditRecords[auditRecords.length - 1] as unknown[]
  assert.equal(publishAudit[0], 'recordResumeSetPublished')
  assert.equal((publishAudit[3] as { published: boolean }).published, true)
  assert.equal((publishAudit[3] as { resumeId: number }).resumeId, 7)

  updates.length = 0
  const unpublished = await service.setPublished(7, false, admin)
  assert.equal(unpublished.publishedAt, null)

  const unpublishAudit = auditRecords[auditRecords.length - 1] as unknown[]
  assert.equal(unpublishAudit[0], 'recordResumeSetPublished')
  assert.equal((unpublishAudit[3] as { published: boolean }).published, false)
  // 第一次 update 置 null，第二次清 isDefault —— 维持 `默认 ⇒ 已发布` 不变量
  assert.equal(updates.length, 2)
  assert.equal(updates[1].isDefault, false)
})

test('把未发布的简历设为默认 → 400 且带可引导的错误码（不自动帮它发布）', async () => {
  let wrote = false
  const tx = {
    resume: {
      findFirst: async () => ({ id: 9, name: '未发布的那份', publishedAt: null }),
      update: async () => {
        wrote = true
        return { id: 9 }
      },
      updateMany: async () => {
        wrote = true
        return { count: 0 }
      },
    },
  }
  const service = createService({ $transaction: async (action: (t: unknown) => unknown) => action(tx) })
  const admin = {
    userId: 'u-1',
    roleKeys: ['admin'],
    permissionKeys: ['Resume.Sections:edit'],
  } as unknown as AuthUser

  await assert.rejects(
    () => service.setDefault(9, admin),
    (error: { getStatus?: () => number; getResponse?: () => unknown }) => {
      assert.equal(error.getStatus?.(), 400)
      assert.equal((error.getResponse?.() as Record<string, unknown>).errorCode, 'Resume.Publish:required')
      return true
    },
  )
  // 关键：拒绝发生在**任何写入之前**，不存在"先偷偷发布再设默认"
  assert.equal(wrote, false)
})
