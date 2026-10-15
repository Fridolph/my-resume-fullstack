import { resumeQueryKeys } from '#layers/ui/app/utils/query-keys'

/**
 * admin 侧可用的 query key。
 *
 * 简历域的 key 定义在**共享层**（`packages/ui/app/utils/query-keys.ts`）——
 * 两端查同一份资源必须用同一个 key，否则缓存失效会静默对不上。
 * 本文件只做"把共享 key 收进本应用命名空间 + 将来补本端独有 key"这一件事。
 *
 * 规范见 docs/web/04_数据层_约定.md。
 */
export const queryKeys = {
  resume: resumeQueryKeys,
}
