/**
 * Query key 规范（Pinia Colada）。
 *
 * 结构 `[scope, ...segments]`，`scope` 与业务域同名（`resume` / `aiTalk`…）。
 * 只在本文件集中声明，便于按前缀批量失效。
 *
 * 目前只有简历域：概览页列表走 colada 缓存；心跳属于"每次都要最新"的一类，
 * 仍走 `useAsyncData`（不进缓存）。规范见 docs/web/04_数据层_约定.md。
 */
export const queryKeys = {
  resume: {
    /** 本人简历列表（概览页） */
    list: () => ['resume', 'list'] as const,
  },
}
