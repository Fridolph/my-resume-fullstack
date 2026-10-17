import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { ALL_PERMISSION_KEYS, type PermissionKey } from './permission-keys'
import { PrismaService } from '../prisma/prisma.service'

/**
 * 找出"代码里定义了、但库里的 `permissions` 表还没有"的权限键（**纯函数**）。
 *
 * 抽成纯函数是为了能单测：真正会出问题的判断只有这一行集合差，
 * 而它错了不会报错，只会让某个角色**静默地少一项权限**。
 *
 * @param persistedKeys 库里已有的权限键
 * @returns 缺失的键（顺序与 `ALL_PERMISSION_KEYS` 一致，便于阅读日志）
 */
export function findMissingPermissionKeys(persistedKeys: readonly string[]): PermissionKey[] {
  const persisted = new Set(persistedKeys)
  return ALL_PERMISSION_KEYS.filter(key => !persisted.has(key))
}

/**
 * 启动自检：**代码里的权限键与库里的权限键是否一致**。
 *
 * ## 为什么需要它（2026-10-17 实际踩到）
 *
 * 权限键是**代码定义、seed 同步入库**的（见 `permission-keys.ts` 的说明）。
 * 但这个"同步"没有任何自动化：DA0-045 往 `ALL_PERMISSION_KEYS` 里加了 `Audit.Log:view`，
 * 而本地库从没重跑过 seed —— 于是 `super_admin` 的角色关联里缺这一项，
 * 超管打开审计页被自己人挡在门外，**报错信息是 403，看不出是数据没同步**。
 *
 * 这类问题的共同点是：**代码对、数据旧，症状与代码缺陷无法区分**。
 * 所以把它变成启动时的一行警告（列出缺哪些键 + 怎么修），
 * 而不是等某个页面突然说"你没有权限"。
 *
 * ## 为什么不直接抛错
 *
 * 库还没 seed 过、或正在做迁移的环境，抛错会让服务起不来 —— 那是用"更糟"换"更早"。
 * 警告 + 明确的修复命令，足以让下一个人一眼看到原因。
 */
@Injectable()
export class PermissionSyncCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionSyncCheck.name)

  constructor(private readonly prismaService: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const rows = await this.prismaService.permission.findMany({ select: { key: true } })
      const missing = findMissingPermissionKeys(rows.map(row => row.key))

      if (missing.length === 0) return

      this.logger.warn(
        `权限键未同步：代码里有 ${missing.length} 个键库中没有 —— ${missing.join(', ')}。` +
          '受影响角色会**缺少对应权限**（表现为 403）。修复：pnpm --filter @rs/server db:seed',
      )
    } catch (error) {
      // 自检本身不该成为启动失败的来源（比如库还没起来）
      this.logger.warn(`权限键自检跳过：${(error as Error).message}`)
    }
  }
}
