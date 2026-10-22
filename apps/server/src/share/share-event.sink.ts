import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SHARE_EVENT_TYPES, type ShareEventInput, type ShareEventSink } from './share.types'

/**
 * 事件写入的 Postgres 实现。
 *
 * ## 为什么异常在这里被吞掉
 *
 * 埋点是**附带信息**，不该影响主路径。如果"记录浏览"失败导致"看不了简历"，
 * 那是拿核心功能去换分析数据 —— 反过来才对。所以这里失败只 `warn`，
 * 调用方也不必 `catch`（配合 `void ... .record()` 的 fire-and-forget 写法）。
 *
 * ## 为什么用 `SHARE_EVENT_TYPES[event.type]` 而不是让调用方传 name/category/action
 *
 * 三个字段必须**同时**正确：`name` 是 `share.link.viewed`、`category` 是 `access`、
 * `action` 是 `viewed`。让调用方自己填就等于把"命名一致性"交给每个调用点，
 * 迟早会出现 `share.link.view` 与 `share.link.viewed` 并存。登记表统一查。
 */
@Injectable()
export class PostgresShareEventSink implements ShareEventSink {
  private readonly logger = new Logger(PostgresShareEventSink.name)

  constructor(private readonly prisma: PrismaService) {}

  async record(event: ShareEventInput): Promise<void> {
    const type = SHARE_EVENT_TYPES[event.type]

    try {
      await this.prisma.shareEvent.create({
        data: {
          shareId: event.shareId,
          name: type.name,
          category: type.category,
          action: type.action,
          revision: event.revision ?? null,
          themeKey: event.themeKey ?? null,
          targetHost: event.targetHost ?? null,
          pagePath: event.pagePath ?? null,
          visitorKey: event.visitorKey ?? null,
          sessionId: event.sessionId ?? null,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
          referrer: event.referrer ?? null,
          occurredAt: event.occurredAt ?? new Date(),
        },
      })
    } catch (error) {
      // 埋点失败绝不冒泡 —— 见类注释
      this.logger.warn(`分享事件写入失败（不影响主流程）：${type.name} ${String(error)}`)
    }
  }
}
