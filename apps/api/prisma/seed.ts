import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_PRESETS } from '../src/auth/permission-keys'
import { PrismaClient } from '../src/generated/prisma/client'
import { hashPassword } from '../src/common/password'

/**
 * 种子数据：把**代码里的**权限键与角色预设同步进库，并建一个管理员账号。
 *
 * ## 为什么用 seed 而不是手写 SQL
 *
 * 权限键的定义源在代码（`src/auth/permission-keys.ts`）；库里那张 `permissions` 表承载的是
 * "谁拥有它"的**关系**。seed 是两者的桥：每次跑都把键补齐、把角色预设对齐 ——
 * 于是"加了新权限键但忘了写迁移"这种情况不会发生。
 *
 * ## 幂等
 *
 * 全部用 `upsert`，可以反复执行。这也是 seed 与"一次性迁移"的分工：
 * 迁移管**结构**（不可重复语义），seed 管**数据**（可重复）。
 *
 * ## 只建一个管理员，不建普通用户
 *
 * 因为 `docs/dev/02_身份与权限_设计.md` §7 里"普通用户身份怎么来（自助注册 / 邀请码 / 管理员开通）"
 * 仍是**待定**。在它定下来之前，多造一个演示用户只会让人误以为流程已经定了。
 * 将来定完，`UserService.create()` 才是唯一的建用户入口，seed 不该绕开它。
 */
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('缺少 DATABASE_URL：先复制 .env.example 为 .env（本地可用仓库根的 compose.yaml 起库）')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

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
      update: {},
      create: {
        key: roleKey,
        name: roleKey === 'admin' ? '管理员' : '普通用户',
        description: roleKey === 'admin' ? '可管理用户与全部内容' : '可浏览与编辑自己的展示配置',
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
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'admin' } })
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: '管理员',
      // ⚠️ 这里是**唯一**出现明文口令的地方，且仅用于本地 seed。
      // 真正的用户创建走 UserService.create() → hashPassword()
      passwordHash: await hashPassword('admin'),
    },
  })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  })

  const [roleCount, permissionCount] = await Promise.all([prisma.role.count(), prisma.permission.count()])
  console.log(`seed 完成：角色 ${roleCount} 个、权限键 ${permissionCount} 个、admin 账号就绪`)
}

main()
  .catch(error => {
    console.error('seed 失败：', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
