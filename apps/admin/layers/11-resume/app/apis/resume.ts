import type { CreateResumeDto, ResumeDraftResponse, ResumeSummaryPage, SaveResumeDraftDto } from '@rs/common'

/**
 * 简历主体的读写接口（admin 侧）。
 *
 * 覆盖：列表 / 创建 / 读取草稿 / 保存草稿 / 重命名 / 删除（物理删除，无恢复入口）。
 * 仍缺**详情预览**（`/resume/:id`）—— 它要等展示层上提到共享层后再接（见 DAO-030 的下一轮计划），
 * 这里先不铺没人调的接口。web 侧另有 `resume-draft.ts`（读写本人草稿），
 * 两者用途不同（admin 管简历主体 + 内容编辑、web 负责公开展示），不合并。
 *
 * `silent: true` + `retry: 0`：失败要落到**页面自己的错误区**（400 的字段问题需要用户逐条改；
 * 保存冲突 409 需要就地提示"另一个窗口改过"），重复提交也没有意义。401 由调用方按需跳登录。
 */
export function createResumeApi() {
  const { $api } = useNuxtApp()

  return {
    /** 导出本人草稿；服务端再次校验所有权与文档摘要。 */
    exportPdf: (id: number, documentHash: string) =>
      $api<Blob, 'blob'>(`/resume/${id}/pdf`, {
        method: 'POST',
        body: { source: 'draft', documentHash },
        responseType: 'blob',
        silent: true,
        retry: 0,
      }),
    /** 本人未删除的简历（概览页，**服务端分页**）；不返回正文，正文走 `getDraft` */
    list: (query: { page?: number; pageSize?: number } = {}) =>
      $api<ResumeSummaryPage>('/resume', { query, silent: true, retry: 0 }),

    create: (input: CreateResumeDto) =>
      $api<ResumeDraftResponse>('/resume', { method: 'POST', body: input, silent: true, retry: 0 }),

    /** 读取本人草稿（完整文档 + 当前 revision），编辑页的入口数据 */
    /** 设为默认展示（互斥：会取消本人其他简历的默认），返回更新后的完整列表 */
    /** 设为默认展示；返回哪一份成了默认（列表由调用方重新拉取） */
    setDefault: (id: number) =>
      $api<{ id: number }>(`/resume/${id}/default`, { method: 'PATCH', silent: true, retry: 0 }),
    getDraft: (id: number) => $api<ResumeDraftResponse>(`/resume/${id}/draft`, { silent: true, retry: 0 }),

    /**
     * 保存整份文档。
     *
     * `expectedRevision` 必须带 —— 后端按它做条件更新，跨窗口并发时返回 409 而不是互相覆盖；
     * 这不是可选项，调用方不能"省掉版本号直接写"。
     */
    saveDraft: (id: number, input: SaveResumeDraftDto) =>
      $api<ResumeDraftResponse>(`/resume/${id}/draft`, { method: 'PUT', body: input, silent: true, retry: 0 }),

    rename: (id: number, name: string) =>
      $api<{ id: number; name: string }>(`/resume/${id}`, { method: 'PATCH', body: { name }, silent: true, retry: 0 }),

    remove: (id: number) => $api<{ id: number }>(`/resume/${id}`, { method: 'DELETE', silent: true, retry: 0 }),
  }
}
