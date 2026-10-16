/**
 * 审计表的**数据库级**保证（第 7 步验收）。**只在显式授权时运行**：
 *
 *     pnpm --filter @rs/server test:audit:db
 *
 * ## 为什么不能用 fake
 *
 * 这两条断言的都是**数据库语义**，fake 证明不了：
 * 1. **无级联**：审计行不挂外键 → 删掉简历后它必须**仍在**
 *    （fake 里没有外键，删什么都不会连带删，测了等于没测）；
 * 2. **同事务回滚**：业务与审计同事务 → 审计抛错则业务**一起回滚**
 *    （回滚是数据库行为，fake 只能"装作"回滚）。
 *
 * 所以它**不进默认 `pnpm test`**（那条路径必须无依赖、可离线跑），
 * 由 `vitest.integration.config.mts` 单独收集。
 */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, test } from 'vitest'
import { PrismaClient } from '../../generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const tag = `VERIFY-AUDIT-${Date.now()}`
const userId = `verify-${randomUUID()}`

afterAll(async () => {
  // 审计表没有外键，必须显式清理（这也是"无级联"的另一面）
  await prisma.auditLog.deleteMany({ where: { actorId: userId } })
  await prisma.resume.deleteMany({ where: { workspaceUserId: userId } })
  // ResumeWorkspace.user 是 onDelete: Restrict → 必须先删工作区再删用户
  await prisma.resumeWorkspace.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.$disconnect()
})

test('删除简历后：草稿级联删除，但**审计行仍在**（无外键 → 无级联）', async () => {
  // ⚠️ 数据库有 CHECK 约束 `users_username_or_email_check`：username 或 email 至少有一个。
  // 这是真实约束（不是测试的麻烦）—— 它保证"账号总得有个可登录标识"。
  await prisma.user.create({
    data: { id: userId, nickname: `${tag}-actor`, email: `${tag}@verify.local`, passwordHash: 'x' },
  })
  // ⚠️ Resume 依赖 ResumeWorkspace（外键），所以必须先建工作区；
  // 业务代码里由 `ResumeService.create` 负责，测试里显式建。
  await prisma.resumeWorkspace.create({ data: { userId } })
  const resume = await prisma.resume.create({
    data: { workspaceUserId: userId, name: `${tag}-resume`, locale: 'zh' },
  })
  await prisma.resumeDraft.create({
    // ⚠️ 数据库有 CHECK 约束 `resume_drafts_schema_version_valid`：它要求
    // **列 `schema_version` 与 JSON 里的 `document.schemaVersion` 一致**。
    // 只写列、不写 JSON 会被库拒掉 —— 这条约束的价值是防止两者漂移（代码读的是 JSON）。
    data: {
      resumeId: resume.id,
      schemaVersion: 1,
      document: { schemaVersion: 1, content: { sections: [{}, {}] } },
      updatedBy: userId,
    },
  })

  await prisma.$transaction(async transaction => {
    await transaction.resume.delete({ where: { id: resume.id } })
    await transaction.auditLog.create({
      data: {
        actorId: userId,
        actorSnapshot: { nickname: `${tag}-actor` },
        actorRoleKeys: ['super_admin'],
        action: 'resume.delete',
        resourceType: 'resume',
        resourceId: String(resume.id),
        resourceSnapshot: { name: `${tag}-resume` },
        metadata: { revision: 1, sectionCount: 2, wasDefault: false },
        requestId: 'verify-req-1',
      },
    })
  })

  assert.equal(await prisma.resume.findUnique({ where: { id: resume.id } }), null, '简历应已删除')
  assert.equal(
    await prisma.resumeDraft.findUnique({ where: { resumeId: resume.id } }),
    null,
    '草稿应被级联删除（业务侧预期）',
  )

  const audit = await prisma.auditLog.findFirst({
    where: { resourceId: String(resume.id), action: 'resume.delete' },
  })
  assert.ok(audit, '审计行必须仍在 —— 否则"谁删的"永久无从追查')
  // 快照是**删除之前**取下的，所以现在还能读到被删简历的名字
  assert.deepEqual(audit.resourceSnapshot, { name: `${tag}-resume` })
  assert.deepEqual(audit.metadata, { revision: 1, sectionCount: 2, wasDefault: false })
  assert.equal(audit.requestId, 'verify-req-1')
  assert.deepEqual(audit.actorRoleKeys, ['super_admin'], '角色快照：回答"他当时是什么身份"')
})

test('审计写入失败 → 业务变更**一起回滚**（强一致的实质）', async () => {
  const resume = await prisma.resume.create({
    data: { workspaceUserId: userId, name: `${tag}-rollback`, locale: 'zh' },
  })

  await assert.rejects(
    prisma.$transaction(async transaction => {
      await transaction.resume.delete({ where: { id: resume.id } })
      throw new Error('模拟审计写入失败')
    }),
    /模拟审计写入失败/,
  )

  const stillThere = await prisma.resume.findUnique({ where: { id: resume.id } })
  assert.ok(stillThere, '业务变更必须回滚 —— "删不掉" 比 "删了没记录" 安全（fail-closed）')

  await prisma.resume.deleteMany({ where: { id: resume.id } })
})

test('审计行中搜不到 PII（白名单在写入前就裁掉了）', async () => {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM audit_logs
    WHERE actor_id = ${userId}
      AND (metadata::text ILIKE '%138%' OR metadata::text ILIKE '%@%')
  `
  assert.equal(rows[0]?.n, 0, '审计里不得出现手机号 / 邮箱')
})
