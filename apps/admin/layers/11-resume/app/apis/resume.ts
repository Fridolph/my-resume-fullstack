import type { CreateResumeDto, ResumeDraftResponse, ResumeSummary } from '@rs/common'

/**
 * 简历主体的读写接口（admin 侧）。
 *
 * 目前只有**列表**与**创建**：重命名 / 软删除属 DAO-029，详情页（`/resume/:id`）尚未实现，
 * 先铺一层没人调的 API 只会增加维护面。web 侧另有 `resume-draft.ts`（读写本人草稿），
 * 两者用途不同（admin 管简历主体、web 编辑与展示正文），不合并。
 *
 * `silent: true` + `retry: 0`：失败要落到**页面自己的错误区**（400 的字段问题需要用户逐条改），
 * 重复提交也没有意义。401 由调用方按需跳登录。
 */
export function createResumeApi() {
  const { $api } = useNuxtApp()

  return {
    /** 本人未删除的简历（概览页）；不返回正文，正文走 `/resume/:id/draft` */
    list: () => $api<ResumeSummary[]>('/resume', { silent: true, retry: 0 }),

    create: (input: CreateResumeDto) =>
      $api<ResumeDraftResponse>('/resume', { method: 'POST', body: input, silent: true, retry: 0 }),
  }
}
