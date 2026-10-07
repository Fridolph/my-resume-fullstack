export type ClassInput = string | null | undefined | false

/**
 * 极简 class 合并：过滤空值后拼接。
 * 用于「组件默认类 + 调用方传入的 ui/class 覆盖」的合并场景。
 * 需要更完整的 tailwind-merge 语义时，可升级为 `clsx` + `tailwind-merge`。
 */
export function cn(...inputs: ClassInput[]): string {
  return inputs.filter(Boolean).join(' ')
}
