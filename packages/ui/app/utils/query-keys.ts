/**
 * Query key 规范（Pinia Colada）—— **两端共用**。
 *
 * 结构 `[scope, ...segments]`，`scope` 与业务域同名（`resume` / `aiTalk`…）。
 * 放在共享层的理由很简单：key 是"同一份数据在缓存里的地址"，
 * 两端查同一份资源却各写一份 key，迟早出现 web 用 `['resume','draft']`、
 * admin 用 `['resume','list']` 这种**对不上、也不会报错**的漂移（失效失效不了，只能靠清缓存）。
 *
 * 各端仍可在自己的 `lib/query-keys.ts` 里补充**该端独有**的 key —— 共享的是规范与同源资源的 key。
 */
export const resumeQueryKeys = {
  /** 本人简历列表（admin 概览页；web 将来若列出简历也用它） */
  list: () => ['resume', 'list'] as const,
  /** 某一份简历的草稿（web 草稿工作台 / admin 编辑页） */
  draft: (id: number | string) => ['resume', 'draft', String(id)] as const,
}
