import { resumeQueryKeys } from '#layers/ui/app/utils/query-keys'

/**
 * web 侧可用的 query key。
 *
 * 简历域的 key 定义在**共享层**（`packages/ui/app/utils/query-keys.ts`）——
 * 两端查同一份资源必须用同一个 key，否则缓存失效会静默对不上。
 * 目前 web 的简历读写走 `useMutation`（无缓存 key），这里先把共享 key 挂上，
 * 等 web 也有"列表/详情"这类缓存型查询时直接可用。
 *
 * 规范见 docs/web/04_数据层_约定.md。
 */
export const queryKeys = {
  resume: resumeQueryKeys,
}
