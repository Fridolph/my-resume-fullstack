/**
 * Query key 规范（Pinia Colada）。
 *
 * 结构 `[scope, ...segments]`，`scope` 与业务域同名（`resume` / `aiTalk` / `health`…）。
 * 只在本文件集中声明，便于按前缀批量失效。规范见 docs/dev/data-layer.md。
 */
export const queryKeys = {
  health: () => ['health'] as const,
}
