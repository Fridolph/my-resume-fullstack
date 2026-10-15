/**
 * 类名拼接（只做拼接，不做冲突消解）。
 *
 * 放 `app/utils/` 而不是 `app/lib/`：Nuxt 的**自动导入**覆盖 `utils/` 与 `composables/`，
 * 所以两端（web / admin）在组件里可以直接写 `cn(...)`，不必 import；`lib/` 不在自动导入范围，
 * 放那里就得每处显式引入。
 *
 * 为什么不引 `tailwind-merge` / `clsx`：共享 layer 应该是"零额外依赖"的，
 * 而这里只需要"追加调用方覆写类"这种场景，冲突由 Tailwind 的生成顺序决定即可。
 * （如果将来真需要冲突消解，先在项目里统一引入再改这一处。）
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
