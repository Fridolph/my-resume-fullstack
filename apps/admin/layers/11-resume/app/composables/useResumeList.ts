import { useQuery } from '@pinia/colada'
import { queryKeys } from '~/lib/query-keys'
import { createResumeApi } from '../apis/resume'

/**
 * 本人简历列表（概览页）。
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
/** 每页条数：与后端 schema 的上限（100）无关，这里取一个"列表页刚好一屏"的值 */
const PAGE_SIZE = 20

export function useResumeList() {
  const api = createResumeApi()

  /**
   * 页码进 query key：colada 按 key 缓存，不分页时"第 2 页"会命中第 1 页的缓存，
   * 表现是**翻页没反应**（数据是旧的），而不会报错。
   */
  const page = ref(1)

  const { data, status, error, refresh } = useQuery({
    key: () => [...queryKeys.resume.list(), String(page.value)],
    query: () => api.list({ page: page.value, pageSize: PAGE_SIZE }),
  })

  return {
    /** 当前页的简历 */
    summaries: computed(() => data.value?.items ?? []),
    /** 总数（服务端返回），用于分页与"共 N 条" */
    total: computed(() => data.value?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
    status,
    error,
    /** 手动刷新（改完默认简历后重新取列表；服务端会返回互斥结果，但缓存仍以重新拉取为准） */
    refresh,
  }
}
