import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, normalizeApiError } from '@rs/common'
import type { AuditAction, AuditResourceType } from '@rs/common'
import { createAuditApi, type AuditLogQuery, type AuditLogRow } from '../apis/audit'

/**
 * 审计页的查询状态：**筛选条件与分页都住在 URL query 里**。
 *
 * ## 为什么放 URL 而不是组件内的 ref
 *
 * 审计页的典型用法是"我查到了一条奇怪的记录，把地址发给同事"。筛选条件不进 URL 的话，
 * 一刷新、一分享就回到默认列表 —— 那等于把排查结果作废。
 * 代价是每次改筛选多一次路由跳转（`replace: true` 不产生历史堆积），可接受。
 *
 * ## 为什么翻页/改筛选都要回到第 1 页
 *
 * 筛选后总条数变小，停在 `page=7` 很可能拿到空列表 —— 用户会以为"没有记录"，
 * 而实际是"页码越界了"。这个坑在列表类页面上几乎必然踩到，所以在源头处理。
 */

/** 一次查询的完整条件（去掉 undefined 后的稳定形状，用于比对"条件变了没"） */
interface AuditFilters {
  action?: AuditAction
  actorId?: string
  resourceType?: AuditResourceType
  resourceId?: string
  from?: string
  to?: string
}

const KNOWN_ACTIONS = new Set<string>(Object.values(AUDIT_ACTIONS))
const KNOWN_RESOURCE_TYPES = new Set<string>(Object.values(AUDIT_RESOURCE_TYPES))

/**
 * 只接受**字典里存在**的 action / resourceType。
 *
 * 为什么不让浏览器把任意字符串带过去：后端会用 zod 拒掉并返回 400，
 * 于是"手改 URL 时打错一个字"会表现成一个看不懂的请求错误。
 * 在这里丢弃未知值，页面就只是忽略它 —— 用户看到的是默认列表，而不是 400。
 */
function readFilters(query: Record<string, unknown>): AuditFilters {
  const pick = (key: string): string | undefined => {
    const value = query[key]
    const first = Array.isArray(value) ? value[0] : value
    return typeof first === 'string' && first.length ? first : undefined
  }

  const rawAction = pick('action')
  const rawResourceType = pick('resourceType')

  return {
    action: rawAction && KNOWN_ACTIONS.has(rawAction) ? (rawAction as AuditAction) : undefined,
    actorId: pick('actorId'),
    resourceType:
      rawResourceType && KNOWN_RESOURCE_TYPES.has(rawResourceType) ? (rawResourceType as AuditResourceType) : undefined,
    resourceId: pick('resourceId'),
    from: pick('from'),
    to: pick('to'),
  }
}

/** 日期选择器的值（`UInputDate` 的 `range` 模式）：只依赖 `toString()`，不引第三方类型 */
export interface DateRangeValue {
  start?: { toString(): string }
  end?: { toString(): string }
}

/**
 * 把"用户选的日期"变成**当天的时间边界**。
 *
 * ⚠️ 这里有个必须处理的问题：日期选择器给的是 `YYYY-MM-DD`（**日历日**），
 * 而后端 `from` / `to` 是**时间点**。如果直接把两个日期都转成当天 00:00，
 * "到 10 月 16 日"会把 10 月 16 日**整天**排除掉 —— 用户会以为"今天没记录"。
 * 所以 `from` 取当天起、`to` 取当天末（本地时区，符合用户对"哪一天"的直觉）。
 */
export function toRangeBounds(range: DateRangeValue | null | undefined, filter: AuditLogQuery): AuditLogQuery {
  if (!range) return filter

  const start = range.start?.toString()
  const end = range.end?.toString()

  if (start) {
    const date = new Date(`${start}T00:00:00`)
    if (!Number.isNaN(date.getTime())) filter.from = date.toISOString()
  }

  if (end) {
    const date = new Date(`${end}T23:59:59.999`)
    if (!Number.isNaN(date.getTime())) filter.to = date.toISOString()
  }

  return filter
}

export function useAuditLog() {
  const route = useRoute()
  const router = useRouter()
  const api = createAuditApi()

  const filters = computed(() => readFilters(route.query as Record<string, unknown>))
  const page = computed(() => {
    const raw = Number(route.query.page)
    return Number.isInteger(raw) && raw > 0 ? raw : 1
  })
  const pageSize = 20

  /**
   * 请求条件（不含分页）：`watch` 只盯它，所以"改筛选"与"翻页"是两种明确的行为 ——
   * 后者不该重置页码。
   */
  const query = computed<AuditLogQuery>(() => ({ ...filters.value, page: page.value, pageSize }))

  const { data, status, error, refresh } = useAsyncData('admin-audit-logs', () => api.list(query.value), {
    watch: [query],
  })

  const items = computed<AuditLogRow[]>(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const pending = computed(() => status.value === 'pending')

  /**
   * 403 要落到**错误页**，不是页面内的小红条。
   *
   * 为什么单独处理：403 是"你是谁"的问题，用户在列表页里重试多少次都没用；
   * 而 5xx 是"服务坏了"，留在页面上给重试入口才对。两者的正确出口不同。
   */
  watch(
    error,
    value => {
      if (!value) return
      const normalized = normalizeApiError(value)
      if (normalized.code === 403) {
        showError({ statusCode: 403, statusMessage: normalized.errorCode })
      }
    },
    { immediate: true },
  )

  /** 改筛选 → 回第 1 页 */
  async function applyFilters(patch: Partial<AuditFilters>) {
    const next: Record<string, string | undefined> = {
      ...(route.query as Record<string, string | undefined>),
      ...patch,
    }
    // 清掉 undefined，避免 URL 里留下空参数
    for (const key of Object.keys(next)) {
      if (next[key] === undefined || next[key] === '') delete next[key]
    }
    delete next.page

    await router.replace({ query: next })
  }

  async function setPage(next: number) {
    await router.replace({ query: { ...(route.query as Record<string, string>), page: String(next) } })
  }

  function clearAll() {
    return router.replace({ query: {} })
  }

  return {
    filters,
    page,
    pageSize,
    items,
    total,
    pending,
    error,
    refresh,
    applyFilters,
    setPage,
    clearAll,
  }
}
