<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AuditAction } from '@rs/common'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_RESOURCE_LABELS,
  summarizeAudit,
} from '../../config/audit-labels'
import { toRangeBounds, useAuditLog, type DateRangeValue } from '../../composables/useAuditLog'
import type { AuditLogRow } from '../../apis/audit'

/**
 * 审计日志（`/audit`）—— **仅超级管理员**。
 *
 * ## 授权分三层，这里只是第一层
 *
 * | 层 | 做什么 | 失败表现 |
 * | --- | --- | --- |
 * | 本页声明 | `roles` + `permissions` → `middleware/permission.ts` | 403 错误页（`app/error.vue`） |
 * | 接口 | 后端 `assertAuditViewer`（角色 + `Audit.Log:view` 缺一不可） | 403 → 同样落到错误页 |
 * | 数据 | —— | —— |
 *
 * 前端这层只挡"直接敲 URL"，**不替代后端**。两层都挡是刻意的：
 * 前端的权限数据来自登录那一刻的会话，可能已经过期；真正作数的是接口。
 *
 * ## 为什么导航入口对所有人可见
 *
 * Owner 2026-10-16 的口径：让 `admin` / `user` 看到这个入口、点进来拿 403 ——
 * **403 本身就是答案**（"系统有审计，但你没这个权限"），比"入口消失、假装没这功能"更诚实。
 */
definePageMeta({
  title: '审计日志',
  middleware: ['auth', 'permission'],
  roles: ['super_admin'],
  permissions: ['Audit.Log:view'],
})

const { filters, page, pageSize, items, total, pending, error, refresh, applyFilters, setPage, clearAll } =
  useAuditLog()

/** 表格列：时间 / 操作者 / 行为 / 资源 / 摘要 / 请求 */
const columns: TableColumn<AuditLogRow>[] = [
  { accessorKey: 'occurredAt', header: '时间' },
  { accessorKey: 'actorId', header: '操作者' },
  { accessorKey: 'action', header: '行为' },
  { accessorKey: 'resourceId', header: '资源' },
  { accessorKey: 'metadata', header: '摘要' },
  { accessorKey: 'requestId', header: '请求' },
]

/**
 * 显式格式化，不用 `toLocaleString()` 的默认选项：
 * SSR（Node）与浏览器默认值可能不同，会造成 hydration 警告（本仓已踩过）。
 */
function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function actorName(row: AuditLogRow): string {
  return row.actorSnapshot?.nickname?.trim() || row.actorId.slice(0, 8)
}

/** 有任意筛选条件时给"清除"入口 —— 否则用户会以为"系统只有这几条" */
const hasFilters = computed(() =>
  Boolean(filters.value.action || filters.value.actorId || filters.value.resourceId || filters.value.from),
)

/** 行为下拉：值来自共享字典（见 `AUDIT_ACTION_OPTIONS`） */
const actionModel = computed({
  get: () => filters.value.action ?? 'all',
  set: (value: string) => void applyFilters({ action: value === 'all' ? undefined : (value as AuditAction) }),
})

/**
 * 时间范围：`UInputDate` 的 range 模式，值是 `{ start, end }`（元素是日历日对象）。
 *
 * ⚠️ 类型上做了一次 `as never` 绑定（见模板）：`UInputDate` 的值类型来自
 * `@internationalized/date`，而那个包只是 `@nuxt/ui` 的**传递依赖**、在本应用里不可解析
 *（pnpm 隔离的 node_modules）。为了命名一个类型去新增依赖不划算，
 * 于是这里用最小结构类型 `DateRangeValue`（只依赖 `toString()`）承接，
 * 绑定处一次性放开。风险面很小：我们只把日历日当 `YYYY-MM-DD` 用。
 */
const dateRange = ref<DateRangeValue | null>(null)

/**
 * 日期改动 → 转成时间边界再写进 URL。
 *
 * 不保留 `UInputDate` 的原始值到 URL：URL 里应该是**可读、可比对**的 ISO 时间点，
 * 而不是序列化后的日历对象（那样刷新后还要反序列化一次，多一处会坏的逻辑）。
 */
function onDateRangeChange(value: DateRangeValue | null | undefined) {
  dateRange.value = value ?? null
  const bounds = toRangeBounds(value, {})
  void applyFilters({ from: bounds.from, to: bounds.to })
}

/** 下钻：点操作者 → 只看这个人干过什么（比"先想好查谁"更贴合排查动作） */
function drillActor(row: AuditLogRow) {
  return applyFilters({ actorId: row.actorId })
}

function drillResource(row: AuditLogRow) {
  return applyFilters({ resourceType: row.resourceType, resourceId: row.resourceId })
}

/** 复制请求 id：与访问日志对齐时要用 */
async function copyRequestId(requestId: string | null) {
  if (!requestId || !import.meta.client) return
  await navigator.clipboard?.writeText(requestId)
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-2xl text-sm leading-6 text-muted">
        关键操作的只增日志：谁在什么时候、对什么、做了什么。记录里不含邮箱等隐私字段，
        操作者与资源都以**写入时刻的快照**保存 —— 账号被清理后仍然读得懂。
      </p>

      <div class="flex items-center gap-2">
        <UButton
          v-if="hasFilters"
          icon="i-lucide-filter-x"
          color="neutral"
          variant="outline"
          label="清除筛选"
          @click="clearAll()"
        />
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" label="刷新" @click="refresh()" />
      </div>
    </header>

    <!-- 筛选区：行为下拉 + 时间范围。两个控件都在 URL 里，刷新与分享都不丢 -->
    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="行为" class="w-48">
        <USelect v-model="actionModel" :items="AUDIT_ACTION_OPTIONS" value-key="value" />
      </UFormField>

      <UFormField label="时间范围" class="w-72">
        <UInputDate :model-value="dateRange as never" range @update:model-value="onDateRangeChange" />
      </UFormField>

      <div v-if="filters.actorId" class="flex items-center gap-2 pb-2">
        <UBadge color="primary" variant="subtle">仅看操作者 {{ filters.actorId.slice(0, 8) }}</UBadge>
        <UButton
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          aria-label="取消操作者筛选"
          @click="applyFilters({ actorId: undefined })"
        />
      </div>

      <div v-if="filters.resourceId" class="flex items-center gap-2 pb-2">
        <UBadge color="primary" variant="subtle">
          仅看 {{ AUDIT_RESOURCE_LABELS[filters.resourceType ?? 'resume'] }} #{{ filters.resourceId }}
        </UBadge>
        <UButton
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          aria-label="取消资源筛选"
          @click="applyFilters({ resourceType: undefined, resourceId: undefined })"
        />
      </div>
    </div>

    <!-- 5xx 留在页面内给重试：这是"服务坏了"，不是"你没权限"（403 已在 composable 里转错误页） -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="审计记录加载失败"
      description="请稍后重试；若持续失败，查看后端日志。"
    />

    <UTable
      v-else
      :data="items"
      :columns="columns"
      :loading="pending"
      :empty="pending ? '加载中…' : '没有符合条件的审计记录'"
      class="shrink-0"
    >
      <template #occurredAt-cell="{ row }">
        <span class="whitespace-nowrap text-sm">{{ formatTime(row.original.occurredAt) }}</span>
      </template>

      <template #actorId-cell="{ row }">
        <button
          type="button"
          class="flex flex-col items-start gap-1 rounded text-left hover:underline"
          :title="`只看 ${row.original.actorId} 的记录`"
          @click="drillActor(row.original)"
        >
          <span class="text-sm font-medium text-highlighted">{{ actorName(row.original) }}</span>
          <span class="font-mono text-xs text-dimmed">{{ row.original.actorRoleKeys.join(', ') || '—' }}</span>
        </button>
      </template>

      <template #action-cell="{ row }">
        <span class="text-sm">{{ AUDIT_ACTION_LABELS[row.original.action] }}</span>
        <span class="ml-2 font-mono text-xs text-dimmed">{{ row.original.action }}</span>
      </template>

      <template #resourceId-cell="{ row }">
        <button type="button" class="rounded text-left hover:underline" @click="drillResource(row.original)">
          <span class="text-sm">{{ AUDIT_RESOURCE_LABELS[row.original.resourceType] }}</span>
          <span class="ml-1 font-mono text-xs text-muted">#{{ row.original.resourceId }}</span>
        </button>
      </template>

      <template #metadata-cell="{ row }">
        <span class="text-sm text-muted">{{ summarizeAudit(row.original) }}</span>
      </template>

      <template #requestId-cell="{ row }">
        <button
          v-if="row.original.requestId"
          type="button"
          class="rounded font-mono text-xs text-muted hover:underline"
          title="复制请求 id"
          @click="copyRequestId(row.original.requestId)"
        >
          {{ row.original.requestId.slice(0, 8) }}
        </button>
        <span v-else class="text-xs text-dimmed">—</span>
      </template>
    </UTable>

    <!-- 分页：服务端分页，总数来自接口 -->
    <div v-if="total > pageSize" class="flex justify-end">
      <UPagination :page="page" :items-per-page="pageSize" :total="total" @update:page="setPage" />
    </div>
  </div>
</template>
