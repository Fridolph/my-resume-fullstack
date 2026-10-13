import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_PRESETS } from '../src/auth/permission-keys'
import { PrismaClient } from '../src/generated/prisma/client'
import { hashPassword } from '../src/common/password'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resumeDocumentSchema, type ResumeDocument } from '@rs/common'

/**
 * 本地角色初始化；将学习账号 super@q.com 绑定为超级管理员。
 * 按代码预设同步角色与权限；保留已有学习账号的密码和删除状态。
 * 后续 admin/user 账号由 UserService.create() 创建。
 * ④ 会为超管准备一份示例简历草稿，便于本地直接调 /resume 接口。
 */
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('缺少 DATABASE_URL：先复制 .env.example 为 .env（本地可用仓库根的 compose.yaml 起库）')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const roleDetails = {
  super_admin: { name: '超级管理员', description: '管理全部业务并创建用户' },
  admin: { name: '管理员', description: '管理业务内容，无创建用户权限' },
  user: { name: '普通用户', description: '浏览与编辑自己的展示配置' },
}

/**
 * 幂等同步权限预设并初始化本地超管，保留已有密码、主键和删除状态。
 *
 * super 是 username 和 nickname；邮箱也写入，便于验证两种登录方式。
 * 初始化绕过 HTTP 创号权限，解决“没有超管就无法创建第一个超管”的问题。
 * 这是本地学习入口，重复执行会确保该邮箱具有超管角色，不用于公开注册。
 */

/**
 * 读取示例简历文档（fixture）。
 *
 * 这份 JSON 由 apps/web 的 mock 经 `importResumeDocument` 真实转换生成，
 * 内容取自 web 的中文 mock（姓名/经历/能力/主题都是真材料，图片字段已清空
 * —— 因为 DAO-028 收紧后的 imageUrl 不接受 data-URI）。
 *
 * 这里再过一次 `resumeDocumentSchema` 是**双保险**：fixture 一旦与契约脱节，
 * seed 会当场失败，而不是把非法文档写进库。
 */
function loadResumeDocument(): ResumeDocument {
  const path = fileURLToPath(new URL('../../../packages/common/test/fixtures/resume-content.json', import.meta.url))
  return resumeDocumentSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
}

async function main() {
  // ① 权限键：以代码为准补齐（新增的键会被插入；已存在的不重复建）
  for (const key of ALL_PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    })
  }

  // ② 角色 + 角色↔权限关联
  for (const [roleKey, presetKeys] of Object.entries(ROLE_PERMISSION_PRESETS)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: roleDetails[roleKey as keyof typeof roleDetails],
      create: {
        key: roleKey,
        ...roleDetails[roleKey as keyof typeof roleDetails],
      },
    })

    const permissions = await prisma.permission.findMany({ where: { key: { in: [...presetKeys] } } })

    // 先清后建：让"预设"成为唯一事实（删掉的权限键也能同步掉），
    // 而不是只做加法——否则代码里移除的权限会永远留在库里
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.rolePermission.createMany({
      data: permissions.map(permission => ({ roleId: role.id, permissionId: permission.id })),
    })
  }

  // ③ 管理员账号（口令仅用于本地开发；生产环境应由运维通过一次性脚本创建并立即改密）
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'super_admin' } })
  const passwordHash = await hashPassword('super!')

  await prisma.$transaction(async transaction => {
    const superAdmin = await transaction.user.upsert({
      where: { username: 'super' },
      update: {},
      create: {
        username: 'super',
        email: 'super@q.com',
        nickname: '超管',
        passwordHash,
      },
    })
    if (superAdmin.deletedAt !== null) {
      throw new Error('学习超管 super@q.com 已软删除，请人工确认恢复方案；seed 不自动恢复用户')
    }

    await transaction.userRole.upsert({
      where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: superAdmin.id, roleId: superAdminRole.id },
    })
  })

  // ④ 示例简历：给超管一份可直接读取/编辑的草稿
  //    - 幂等：已存在未删除的简历就跳过，**不覆盖**任何已有内容（可能已被人工编辑过）
  //    - 全部软删除时才会重新造一份，避免"删了却再也造不出来"
  //    - document 取自 web 的真实 mock（见 packages/common/test/fixtures/resume-content.json），
  //      读取时再过一次 resumeDocumentSchema 校验，保证写库的一定是合法文档
  const superAdmin = await prisma.user.findUniqueOrThrow({ where: { username: 'super' }, select: { id: true } })
  const existingResume = await prisma.resume.findFirst({
    where: { workspaceUserId: superAdmin.id, deletedAt: null },
    select: { id: true, name: true },
  })

  if (existingResume) {
    console.log(`简历数据：已存在（${existingResume.name} / ${existingResume.id}），跳过，不覆盖已有内容`)
  } else {
    await prisma.resumeWorkspace.upsert({
      where: { userId: superAdmin.id },
      create: { userId: superAdmin.id },
      update: {},
    })
    const resume = await prisma.resume.create({
      data: {
        name: '示例简历',
        locale: 'zh',
        workspaceUserId: superAdmin.id,
        draft: {
          create: {
            schemaVersion: 1,
            document: loadResumeDocument(),
            updatedBy: superAdmin.id,
          },
        },
      },
      select: { id: true },
    })
    console.log(`简历数据：已为 super 创建示例简历（id=${resume.id}，含 1 份草稿 rev=1）`)
  }

  const [roleCount, permissionCount] = await Promise.all([prisma.role.count(), prisma.permission.count()])
  console.log(`seed 完成：角色 ${roleCount} 个、权限键 ${permissionCount} 个、学习超管 super@q.com 就绪`)
}

main()
  .catch(error => {
    console.error('seed 失败：', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
