import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import {
  getSectionDefinition,
  resumeSectionDefinitions,
  type ResumeDisplayConfig,
  type ResumeSectionKey,
  type ResumeSlotKey,
} from '@rs/common'

/**
 * 简历的**排布计算**：把区块按「配置顺序 + 栏位归属」分到各栏。
 *
 * 从 `apps/web/layers/11-public-resume/.../ResumePageContainer.vue` 抽出来（DAO-034 批 2）——
 * 原来它和"拖拽排序"揉在同一个组件里，但这两件事的**归属不同**：
 * - 排布计算是**纯读**：给定 display 配置算出三栏各有谁 —— 公开站、草稿工作台、admin 的只读详情页都要用；
 * - 拖拽是**编辑交互**：依赖 `sortablejs`，只有编辑态需要，留在各自的容器里。
 *
 * ⚠️ 为什么放 `packages/ui` 而不是 `packages/common`：本文件里有 **Tailwind 类名字面量**
 * （`lg:grid-cols-[300px_minmax(0,1fr)_300px]` 之类）。Tailwind 只扫描源码里的静态字符串，
 * 而 `packages/ui` 在两端 `main.css` 的 `@source` 里 —— 挪进纯 TS 的 common 会让这些类名不生成。
 */

/** 三个栏位的固定 DOM 顺序（移动端单列时也按这个顺序阅读） */
export const RESUME_SLOT_ORDER: ResumeSlotKey[] = ['side', 'main', 'rail']

export function useResumeLayout(
  config: MaybeRefOrGetter<ResumeDisplayConfig>,
  editable: MaybeRefOrGetter<boolean> = false,
) {
  const cfg = computed(() => toValue(config))
  const isEditable = computed(() => toValue(editable) === true)

  /** 区块归属：配置覆盖 > 注册表默认 */
  function slotOf(key: ResumeSectionKey): ResumeSlotKey {
    return cfg.value.sections.slot[key] ?? getSectionDefinition(key)?.defaultSlot ?? 'main'
  }

  /** 最终顺序 = 配置顺序 + 未列出的按默认顺序补齐，再过滤隐藏项 */
  const orderedKeys = computed(() => {
    const configured = cfg.value.sections.order.filter(key => getSectionDefinition(key))
    const rest = resumeSectionDefinitions
      .filter(item => !configured.includes(item.key))
      .sort((a, b) => a.defaultOrder - b.defaultOrder)
      .map(item => item.key)

    return [...configured, ...rest].filter(key => !cfg.value.sections.hidden.includes(key))
  })

  /** 按布局模式分栏：single 全并入 main；split 把 rail 并入 main */
  const columns = computed(() => {
    const mode = cfg.value.layout.mode
    const buckets: Record<ResumeSlotKey, ResumeSectionKey[]> = { side: [], main: [], rail: [] }

    for (const key of orderedKeys.value) {
      let slot = slotOf(key)
      if (mode === 'single') {
        slot = 'main'
      } else if (mode === 'split' && slot === 'rail') {
        slot = 'main'
      }
      buckets[slot].push(key)
    }

    return buckets
  })

  /** 当前布局下**有效**的栏位：single 只有 main，split 没有 rail（rail 并入 main） */
  const activeSlots = computed<ResumeSlotKey[]>(() => {
    const mode = cfg.value.layout.mode
    if (mode === 'threeColumn') {
      return ['side', 'main', 'rail']
    }
    if (mode === 'split') {
      return ['side', 'main']
    }
    return ['main']
  })

  /** 托盘里的模块（编辑态用） */
  const trayKeys = computed(() => cfg.value.sections.hidden.filter(key => getSectionDefinition(key)))

  /**
   * 是否渲染某一栏。
   *
   * 非编辑态：空栏不渲染（布局自然塌陷，与公开站一致）；
   * 编辑态：**有效**栏位即使为空也渲染，作为可落区域。
   */
  function showsSlot(slot: ResumeSlotKey) {
    return columns.value[slot].length > 0 || (isEditable.value && activeSlots.value.includes(slot))
  }

  /**
   * 栅格类必须是**字面量**（见文件头说明）：Tailwind 扫源码里的静态字符串，
   * 拼接出来的类名不会生成样式。
   *
   * split 的两档宽度对齐旧站（旧站固定 `lg:320px / xl:360px`）：
   * `compact` ≈ 旧站观感，`wide` 再各宽一档。
   */
  const gridClass = computed(() => {
    const { mode, splitSide, sideWidth } = cfg.value.layout
    const hasSide = showsSlot('side')
    const hasRail = showsSlot('rail')
    const wide = sideWidth === 'wide'

    if (mode === 'threeColumn') {
      if (hasSide && hasRail) {
        return 'lg:grid-cols-[300px_minmax(0,1fr)_300px]'
      }
      if (hasSide) {
        return 'lg:grid-cols-[300px_minmax(0,1fr)]'
      }
      if (hasRail) {
        return 'lg:grid-cols-[minmax(0,1fr)_300px]'
      }
      return 'lg:grid-cols-1'
    }

    if (mode === 'split' && hasSide) {
      if (splitSide === 'right') {
        return wide
          ? 'lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]'
          : 'lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]'
      }
      return wide
        ? 'lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]'
        : 'lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]'
    }

    return 'lg:grid-cols-1'
  })

  /** 信息栏与右栏跟随滚动；主内容列不跟随，但通栏时要限宽 */
  function columnClass(slot: ResumeSlotKey) {
    const classes: string[] = []

    if (cfg.value.layout.stickySide && slot !== 'main') {
      classes.push('lg:sticky lg:top-20 lg:self-start')
    }

    // 通栏模式：正文单独限宽并居中 —— 1920 容器下不限制的话单行会接近 1800px，难读
    if (cfg.value.layout.mode === 'single' && slot === 'main') {
      classes.push('lg:mx-auto lg:max-w-4xl')
    }

    return classes.join(' ')
  }

  return { orderedKeys, columns, activeSlots, trayKeys, showsSlot, gridClass, columnClass, slotOf }
}
