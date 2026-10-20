import { useQuery } from '@pinia/colada'
import { queryKeys } from '~/lib/query-keys'
import { createResumeApi } from '../apis/resume'

/**
 * 本人简历列表（概览页）：**分页 + 搜索 + 筛选 + 排序**。
 *
 * 走 colada 缓存而不是 `useAsyncData`：列表属于"频繁但不常变"的数据 ——
 * 从创建页返回时直接命中缓存，内容变更由创建方 `invalidateQueries` 精确失效，
 * 不必每进一次页面都重新拉一遍。
 *
 * 请求形状在 `apis/resume.ts`，这里只做组合（域内约定：组件不直接发请求、
 * 实例细节不外泄）。
 *
 * 对外只暴露 colada 的 `status`（`'pending' | 'error' | 'success'`）与 `error`，
 * 不另造一套状态名 —— 少一层翻译就少一处语义漂移。
 */
/** 每页条数的可选值（后端 schema 上限 100；这里只暴露常用档位） */
export const RESUME_PAGE_SIZE_OPTIONS: number[] = [10, 20, 50, 100]
/** 默认每页条数：列表页刚好一屏 */
const DEFAULT_PAGE_SIZE = 20

export type ResumeListPublished = 'all' | 'published' | 'draft'
export type ResumeListSortKey = 'updatedAt' | 'createdAt' | 'name'

export function useResumeList() {
  const api = createResumeApi()

  /**
   * 页码与**全部查询条件**都进 query key：colada 按 key 缓存，
   * 少放一个条件就会表现为"改了没反应"（命中的是旧缓存），而不会报错。
   */
  const page = ref(1)
  /** 每页条数（用户可调，见 `RESUME_PAGE_SIZE_OPTIONS`） */
  const pageSize = ref(DEFAULT_PAGE_SIZE)

  /** 输入框里的原始值 */
  const q = ref('')
  /**
   * 真正进请求的关键词（**防抖后**）。
   * 直接绑 `q` 会让每敲一个字符发一次请求 —— 既是无谓往返，也会让缓存里堆满中间态。
   */
  const keyword = ref('')
  const published = ref<ResumeListPublished>('all')
  const sort = ref<ResumeListSortKey>('updatedAt')
  const order = ref<'asc' | 'desc'>('desc')

  /** 防抖时长（与 web 端同一个口径：300ms 太快，打字中途就触发） */
  const SEARCH_DEBOUNCE_MS = 1000

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(q, value => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      keyword.value = value.trim()
      page.value = 1 // 换关键词必须回第 1 页，否则会停在越界页码上看到空列表
    }, SEARCH_DEBOUNCE_MS)
  })

  /** 按 Enter：跳过防抖，立即搜索（"我已经打完了"的显式表达） */
  function applySearchNow() {
    if (searchTimer) clearTimeout(searchTimer)
    keyword.value = q.value.trim()
    page.value = 1
  }
  onScopeDispose(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  watch([published, sort, order], () => {
    page.value = 1
  })

  // 改每页条数同样回第 1 页（原来第 2 页在更小的页长下可能已越界）
  watch(pageSize, () => {
    page.value = 1
  })

  const { data, status, error, refresh } = useQuery({
    key: () => [
      ...queryKeys.resume.list(),
      String(page.value),
      String(pageSize.value),
      keyword.value,
      published.value,
      sort.value,
      order.value,
    ],
    query: () =>
      api.list({
        page: page.value,
        pageSize: pageSize.value,
        q: keyword.value || undefined,
        published: published.value === 'all' ? undefined : published.value === 'published',
        sort: sort.value,
        order: order.value,
      }),
  })

  /** 有任一条件生效时才显示"清除" —— 否则是个永远无意义的按钮 */
  const hasQuery = computed(
    () => Boolean(keyword.value) || published.value !== 'all' || sort.value !== 'updatedAt' || order.value !== 'desc',
  )

  function clearQuery() {
    q.value = ''
    keyword.value = ''
    published.value = 'all'
    sort.value = 'updatedAt'
    order.value = 'desc'
    page.value = 1
  }

  return {
    /** 当前页的简历 */
    summaries: computed(() => data.value?.items ?? []),
    /** 总数（服务端返回），用于分页与"共 N 条" */
    total: computed(() => data.value?.total ?? 0),
    page,
    pageSize,
    status,
    error,
    /** 手动刷新（改完默认简历后重新取列表；服务端会返回互斥结果，但缓存仍以重新拉取为准） */
    refresh,
    // 查询条件（页面持有 UI，composable 持有状态与请求）
    q,
    published,
    sort,
    order,
    hasQuery,
    clearQuery,
    applySearchNow,
  }
}
