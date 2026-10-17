import assert from 'node:assert/strict'
import { test } from 'vitest'
import { buildResumeDocument } from '@rs/common'
import { ResumeService } from '../resume.service'
import type { AuthUser } from '../../common/http-context'

type PrismaDouble = ConstructorParameters<typeof ResumeService>[0]
type AuditDouble = ConstructorParameters<typeof ResumeService>[1]

// 用共享的"最小输入 → 完整文档"构造器：手写一份完整文档既长又容易随契约过期
const document = buildResumeDocument({
  content: { sections: [{ type: 'profile', data: { name: '作者' } }] },
} as never)

function createService(tx: object, actor: AuthUser) {
  void actor
  const prismaService = {
    $transaction: async (callback: (t: unknown) => Promise<unknown>) => callback(tx),
  }
  return new ResumeService(prismaService as unknown as PrismaDouble, {} as unknown as AuditDouble)
}

function identity(permissionKeys: string[]): AuthUser {
  return { userId: 'u-1', email: null, nickname: '作者', sessionVersion: 1, roleKeys: ['admin'], permissionKeys }
}

/**
 * 展示配置的写路径有三条**必须成立**的性质，且都不会报错、只在特定条件下显形：
 * 1. 没有 `Resume.Display:edit` 就不能改（这个键此前零实现）；
 * 2. 只换 `document.display`，其它字段原样保留；
 * 3. **不推进 revision** —— 推进了就会让"改正文的人"莫名 409。
 */
test('updateDisplay：缺 Resume.Display:edit 时 403，且不访问数据库', async () => {
  let touched = false
  const service = createService(
    {
      resumeDraft: {
        findFirst: async () => {
          touched = true
          return null
        },
      },
    },
    identity([]),
  )

  await assert.rejects(
    service.updateDisplay(1, { display: document.display }, identity([])),
    error => (error as { getStatus(): number }).getStatus() === 403,
  )
  assert.equal(touched, false, '没权限就不该查库')
})

test('updateDisplay：只替换 display，且不写 revision', async () => {
  let updateData: Record<string, unknown> | undefined
  const service = createService(
    {
      resumeDraft: {
        findFirst: async () => ({ id: 7, document }),
        update: async (args: { data: Record<string, unknown> }) => {
          updateData = args.data
          return {}
        },
      },
    },
    identity(['Resume.Display:edit']),
  )

  const next = { ...document.display, style: { id: 'pro' as const } }
  const result = await service.updateDisplay(1, { display: next }, identity(['Resume.Display:edit']))

  assert.deepEqual(result.display.style, { id: 'pro' })
  assert.equal('revision' in (updateData ?? {}), false, 'revision 是内容的乐观锁，外观不该碰')
  // 内容未被改动
  const written = updateData?.document as typeof document
  assert.deepEqual(written.content, document.content)
  assert.deepEqual(written.display, next)
})

test('updateDisplay：草稿不存在时 404', async () => {
  const service = createService({ resumeDraft: { findFirst: async () => null } }, identity(['Resume.Display:edit']))

  await assert.rejects(
    service.updateDisplay(999, { display: document.display }, identity(['Resume.Display:edit'])),
    error => (error as { getStatus(): number }).getStatus() === 404,
  )
})
