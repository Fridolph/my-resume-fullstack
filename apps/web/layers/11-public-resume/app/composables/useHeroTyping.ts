import type { MaybeRefOrGetter } from 'vue'

/** 打字节奏：每字 135ms（Owner 逐轮校准：200 → 150 → 135） */
export const HERO_TYPING_SPEED = 135

/** 打完后停留 5s，再从头重播 */
export const HERO_TYPING_HOLD = 5000

/**
 * Intro 的打字机。
 *
 * 三个决定（都有取舍）：
 * 1. **逐字显形用 CSS stagger，不用 JS 逐字改文本**。全文始终在 DOM 里 —— SSR 一致、
 *    文本可选中、读屏可读（整句另有 `sr-only`），也避免了"先渲染全文再被清空重打"的闪烁。
 * 2. **循环靠自增 `cycle` + 组件上 `:key`**，让 Vue 重建节点从而重播 CSS 动画。
 *    比"重置 CSS 变量/手动 reflow"更直白，也不会留下脏状态。
 * 3. **`prefers-reduced-motion: reduce` 下不循环也不打字**：直接静态显示全文（见组件样式）。
 *
 * 断句用 `match` 而非 split + lookbehind：lookbehind 在 Safari < 16.4 是**解析期**报错，
 * 整个组件都加载不了 —— 这类兼容性代价不对等。
 */
export function useHeroTyping(summary: MaybeRefOrGetter<string>, options: { speed?: number; hold?: number } = {}) {
  const speed = options.speed ?? HERO_TYPING_SPEED
  const hold = options.hold ?? HERO_TYPING_HOLD

  const sentences = computed(() =>
    // 断句只在「。！？」处：**分号不断** —— Owner 要求整段作为主张句
    (toValue(summary).match(/[^。！？!?\n]+[。！？!?]?/g) ?? []).map(sentence => sentence.trim()).filter(Boolean),
  )

  /** 主张句：升为大字，并逐字显形 */
  const lead = computed(() => sentences.value[0] ?? '')

  /**
   * 逐字拆开只为「由左至右依次显形」；
   * 整句文本另以 `sr-only` 呈现 —— 否则读屏会把每个字当成独立文本节点来读。
   */
  const leadChars = computed(() => Array.from(lead.value))

  /** 其余句子：默认折叠到 2 行，展开看全文 */
  const rest = computed(() => sentences.value.slice(1))
  const restText = computed(() => rest.value.join(''))

  /** 打字窗口：决定光标何时停住（`--typing`），也是重播周期的前半段 */
  const typingWindow = computed(() => `${leadChars.value.length * speed}ms`)

  /** 自增计数器：组件用它作 `:key`，每次 +1 就重播一遍打字动画 */
  const cycle = ref(0)
  const looping = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null

  function clear() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function schedule() {
    clear()
    timer = setTimeout(
      () => {
        cycle.value += 1
        schedule()
      },
      leadChars.value.length * speed + hold,
    )
  }

  function start() {
    if (!import.meta.client) {
      return
    }

    // 降级：不动，也不循环（静态显示全文即可）
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      looping.value = false
      return
    }

    looping.value = true
    schedule()
  }

  onMounted(start)
  onBeforeUnmount(clear)

  // 编辑态改文案后按新长度重新计时
  watch(leadChars, () => {
    if (looping.value) {
      schedule()
    }
  })

  return { sentences, lead, leadChars, rest, restText, typingWindow, cycle, looping, speed }
}
