import { fetchHealth } from "~/apis/health";
import { queryKeys } from "~/lib/query-keys";

/**
 * 后端连通性查询。
 *
 * - SSR 首屏会取一次（colada 在服务端执行 query 函数）；
 * - 客户端可用 `useQueryCache().invalidateQueries({ key: queryKeys.health() })` 失效重取；
 * - `staleTime` 内不再自动重取，避免侧栏 / 多组件重复命中。
 */
export function useHealthQuery() {
  return useQuery({
    key: queryKeys.health(),
    query: fetchHealth,
    staleTime: 30_000,
  });
}
