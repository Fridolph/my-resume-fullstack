import { fetchHealth } from "~/apis/health";
import { queryKeys } from "~/lib/query-keys";

/** 后端连通性查询：SSR 首屏取一次，客户端可失效重取 */
export function useHealthQuery() {
  return useQuery({
    key: queryKeys.health(),
    query: fetchHealth,
    staleTime: 30_000,
  });
}
