/**
 * Query key 规范（Pinia Colada）。
 *
 * 约定：
 * - 结构为 `[scope, ...segments]`，`scope` 与业务域同名（`resume` / `publish` / `ai` / `auth` / `health`）；
 * - 只在本文件集中声明，不在组件里手写数组，否则失效（invalidate）范围容易对不上；
 * - 跨域共享数据放在最外层 scope，域内细分放 segments，便于按前缀批量失效。
 *
 * 例：
 * ```ts
 * queryKeys.resume.draft()          // ['resume', 'draft']
 * queryKeys.resume.published('zh')  // ['resume', 'published', 'zh']
 * ```
 */
export const queryKeys = {
  health: () => ["health"] as const,
};
