import type { ResumeDraftResponse } from '@rs/common'

/**
 * 公开简历读取（访客无需登录）。
 *
 * 对应后端两个 `@Public()` 路由：`GET /resume/public` 与 `GET /resume/public/:id`。
 *
 * ⚠️ 与 `resume-draft.ts` 的分工：那个模块走的是**作者视角**（带身份、带所有权过滤的
 * `/resume/:id/draft`），本模块只读**公开内容**。两者刻意不合并 ——
 * "这个接口允不允许外人读"应当能从模块名一眼看出来。
 *
 * `silent: true`：公开页自己渲染空态与错误提示，不要让请求层再弹一个全局 toast。
 */
export function createPublicResumeApi() {
  const { $api } = useNuxtApp()
  return {
    /** 首页 `/` 的数据源：作者标为「默认展示」的那一份；没设默认时 404 */
    findDefault: () => $api<ResumeDraftResponse>('/resume/public', { silent: true, retry: 0 }),
    /** `/resume/:id` 的数据源：按 id 读某一份公开简历；不存在或作者已注销时 404 */
    findById: (id: number | string) =>
      $api<ResumeDraftResponse>(`/resume/public/${encodeURIComponent(String(id))}`, { silent: true, retry: 0 }),
  }
}
