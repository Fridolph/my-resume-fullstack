import type { InjectionKey, MaybeRefOrGetter, Ref, VNode } from 'vue'
import { useEventListener } from '@vueuse/core'

export type SpotlightTourSide = 'top' | 'bottom' | 'left' | 'right'

export interface SpotlightTourStep {
  /**
   * 高亮目标：CSS 选择器 / Element / null（居中无目标）
   * 注意：不要用会被 Reka 覆盖的 content.id，优先用自己节点上的 id/class
   */
  target?: MaybeRefOrGetter<string | Element | null | undefined>
  title?: string
  body?: string
  /** 偏好气泡方向；空间不足时会自动换边 */
  side?: SpotlightTourSide
  /** 需要用户点击高亮区域才能继续（隐藏「下一步」） */
  requireAction?: boolean
  /** 主 target 找不到时的兜底选择器 */
  fallbackTarget?: string
  /**
   * 额外纳入挖洞的选择器（如 InputMenu 建议浮层）。
   * 气泡仍锚定主 target，挖洞取主目标与这些元素的包围盒并集。
   */
  includeTargets?: string[]
  [key: string]: any
}

export interface UseSpotlightTourOptions {
  initialStep?: number
  loop?: boolean
  scrollIntoView?: boolean | ScrollIntoViewOptions
  /** 挖洞相对目标的外扩像素 */
  pad?: number
  /** 加在目标元素上的高亮 class */
  highlightClass?: string
  /** 窄屏断点，低于此宽度优先上下排布气泡 */
  narrowBreakpoint?: number
}

export interface SpotlightHoleRect {
  top: number
  left: number
  width: number
  height: number
}

/** UPopover / Reka 可用的虚拟锚点（无真实 DOM 时居中） */
export interface SpotlightVirtualAnchor {
  getBoundingClientRect: () => DOMRect
}

export type SpotlightReference = HTMLElement | SpotlightVirtualAnchor

/** TourSpotlightStep 向父组件注册的步骤描述 */
export interface TourSpotlightStepRegistration {
  id: string
  /** 书写顺序（注册序号），step 未传时用它排序 */
  order: number
  /** 显式排序权重；不传则按 order */
  step?: number
  /** 高亮目标；null / 省略 → 居中 */
  target: string | null
  side?: SpotlightTourSide
  requireAction?: boolean
  fallbackTarget?: string
  /** 额外纳入挖洞的选择器（建议浮层等） */
  includeTargets?: string[]
  /** 步骤气泡内容（子组件 default slot） */
  getContent: () => VNode | VNode[] | undefined
  /** 步骤自定义底部（子组件 #footer）；有则覆盖默认底部 */
  getFooter?: (props: TourSpotlightFooterSlotProps) => VNode | VNode[] | undefined
}

/** 默认底部栏配置 */
export interface TourSpotlightFooterConfig {
  /** 是否展示底部栏 */
  show?: boolean
  /** 是否展示步骤计数 */
  showStep?: boolean
  /** 是否展示操作按钮（requireAction 为 true 时仍隐藏） */
  showAction?: boolean
  /** requireAction 时是否展示提示文案 */
  showHint?: boolean
  /** 操作按钮文案 */
  actionLabel?: string
  /** 操作按钮禁用 */
  actionDisabled?: boolean
  /** requireAction 时的提示文案 */
  hintLabel?: string
}

/** 传给步骤 #footer / 默认底部的插槽参数 */
export interface TourSpotlightFooterSlotProps {
  index: number
  total: number
  stepLabel: string
  requireAction: boolean
  isLast: boolean
  footer: Required<TourSpotlightFooterConfig>
  /** 触发与默认按钮相同的 action 事件 */
  action: () => void
}

export interface TourSpotlightContext {
  register: (entry: TourSpotlightStepRegistration) => void
  unregister: (id: string) => void
  update: (
    id: string,
    patch: Partial<Omit<TourSpotlightStepRegistration, 'id'>> & {
      getContent?: TourSpotlightStepRegistration['getContent']
      getFooter?: TourSpotlightStepRegistration['getFooter']
    },
  ) => void
  /** 当前激活步骤 id（排序后） */
  activeId: Ref<string | null>
}

export const tourSpotlightKey: InjectionKey<TourSpotlightContext> = Symbol('TourSpotlight')

const DEFAULT_HIGHLIGHT_CLASS = 'gs-tour-highlight'

function createCenterAnchor(): SpotlightVirtualAnchor {
  return {
    getBoundingClientRect() {
      // 0×0 锚在视口中心；配合 side:bottom + align:center，
      // 再上移约半个气泡高度，让 UPopover 视觉上落在正中
      const estimateHalfH = 80
      const x = typeof window === 'undefined' ? 0 : window.innerWidth / 2
      const y = typeof window === 'undefined' ? 0 : window.innerHeight / 2 - estimateHalfH
      return {
        x,
        y,
        top: y,
        left: x,
        right: x,
        bottom: y,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      } as DOMRect
    },
  }
}

/**
 * 基于 Nuxt UI `useTour` 的 Spotlight 引导：
 * - 四块遮罩挖洞
 * - 无 target 时全屏遮罩 + 气泡居中
 * - 等待 Popover/Slideover 进场后再定位
 * - 缩放时只更新几何，不重建气泡
 */
export function useSpotlightTour(steps: MaybeRefOrGetter<SpotlightTourStep[]>, options: UseSpotlightTourOptions = {}) {
  const {
    pad = 6,
    highlightClass = DEFAULT_HIGHLIGHT_CLASS,
    narrowBreakpoint = 640,
    initialStep,
    loop,
    scrollIntoView,
  } = options

  const tour = useTour(steps, { initialStep, loop, scrollIntoView })

  const hole = ref<SpotlightHoleRect | null>(null)
  const highlightEl = ref<SpotlightReference | null>(null)
  const coachSide = ref<SpotlightTourSide>('bottom')
  const centerAnchor = createCenterAnchor()

  const currentStep = computed(() => tour.current.value as SpotlightTourStep | undefined)
  const requireAction = computed(() => !!currentStep.value?.requireAction)

  /** 无 target / null target → 居中独立展示（不挖洞） */
  const isCentered = computed(() => {
    const step = currentStep.value
    if (!step) {
      return false
    }
    const target = toValue(step.target)
    return target == null && !step.fallbackTarget
  })

  const dimParts = computed(() => {
    if (!import.meta.client) {
      return [{ top: '0px', left: '0px', width: '100%', height: '100%' }]
    }

    const vw = window.innerWidth
    const vh = window.innerHeight

    // 统一用 top/left/width/height，便于 CSS transition 平滑过渡
    if (!hole.value) {
      return [{ top: '0px', left: '0px', width: `${vw}px`, height: `${vh}px` }]
    }

    const top = Math.max(hole.value.top, 0)
    const left = Math.max(hole.value.left, 0)
    const width = Math.max(hole.value.width, 0)
    const height = Math.max(hole.value.height, 0)

    return [
      { top: '0px', left: '0px', width: `${vw}px`, height: `${top}px` },
      {
        top: `${top + height}px`,
        left: '0px',
        width: `${vw}px`,
        height: `${Math.max(vh - top - height, 0)}px`,
      },
      { top: `${top}px`, left: '0px', width: `${left}px`, height: `${height}px` },
      {
        top: `${top}px`,
        left: `${left + width}px`,
        width: `${Math.max(vw - left - width, 0)}px`,
        height: `${height}px`,
      },
    ]
  })

  const coachContent = computed(() => {
    if (isCentered.value) {
      return {
        side: 'bottom' as const,
        align: 'center' as const,
        sideOffset: 0,
        avoidCollisions: false,
      }
    }
    return {
      side: coachSide.value,
      sideOffset: 12,
      collisionPadding: 12,
      avoidCollisions: true,
    }
  })

  function clearHighlight() {
    if (!import.meta.client) {
      return
    }
    document.querySelectorAll(`.${highlightClass}`).forEach(el => el.classList.remove(highlightClass))
    highlightEl.value = null
  }

  function applyCentered() {
    clearHighlight()
    hole.value = null
    coachSide.value = 'bottom'
    highlightEl.value = centerAnchor
  }

  function resolveBySelector(selector: string): HTMLElement | null {
    try {
      const el = document.querySelector(selector)
      return el instanceof HTMLElement ? el : null
    } catch {
      return null
    }
  }

  function resolveTargetEl(): HTMLElement | null {
    if (!import.meta.client || isCentered.value) {
      return null
    }

    const step = currentStep.value
    const target = toValue(step?.target)

    if (typeof target === 'string') {
      const selector = target.startsWith('#') || target.startsWith('.') ? target : `#${target}`
      const el = resolveBySelector(selector)
      if (el) {
        return el
      }
    } else if (target instanceof HTMLElement) {
      return target
    }

    if (step?.fallbackTarget) {
      const fallback = resolveBySelector(step.fallbackTarget)
      if (fallback) {
        return fallback
      }
    }

    const raw = toValue(tour.reference)
    return raw instanceof HTMLElement ? raw : null
  }

  function resolveIncludeEls(): HTMLElement[] {
    const selectors = currentStep.value?.includeTargets
    if (!selectors?.length || !import.meta.client) {
      return []
    }

    const result: HTMLElement[] = []
    for (const raw of selectors) {
      const selector = raw.startsWith('#') || raw.startsWith('.') || raw.startsWith('[') ? raw : `#${raw}`
      const el = resolveBySelector(selector)
      if (!el) {
        continue
      }
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        result.push(el)
      }
    }
    return result
  }

  function unionHoleRect(els: HTMLElement[]): SpotlightHoleRect {
    let top = Infinity
    let left = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for (const el of els) {
      const rect = el.getBoundingClientRect()
      top = Math.min(top, rect.top)
      left = Math.min(left, rect.left)
      right = Math.max(right, rect.right)
      bottom = Math.max(bottom, rect.bottom)
    }
    return {
      top: top - pad,
      left: left - pad,
      width: right - left + pad * 2,
      height: bottom - top + pad * 2,
    }
  }

  function pickCoachSide(el: HTMLElement): SpotlightTourSide {
    const preferred = (currentStep.value?.side ?? 'bottom') as SpotlightTourSide
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const edge = 12
    const gap = 12
    const coachW = Math.min(256, vw - edge * 2)
    const coachH = 148

    const space = {
      top: rect.top - edge,
      bottom: vh - rect.bottom - edge,
      left: rect.left - edge,
      right: vw - rect.right - edge,
    }
    const need = {
      top: coachH + gap,
      bottom: coachH + gap,
      left: coachW + gap,
      right: coachW + gap,
    }

    if (space[preferred] >= need[preferred]) {
      return preferred
    }

    const order: SpotlightTourSide[] =
      vw < narrowBreakpoint ? ['bottom', 'top', 'left', 'right'] : [preferred, 'bottom', 'top', 'right', 'left']

    for (const side of order) {
      if (space[side] >= need[side]) {
        return side
      }
    }

    return (['bottom', 'top', 'left', 'right'] as SpotlightTourSide[]).reduce((best, side) =>
      space[side] > space[best] ? side : best,
    )
  }

  function applyHole(el: HTMLElement) {
    document.querySelectorAll(`.${highlightClass}`).forEach(node => {
      if (node !== el) {
        node.classList.remove(highlightClass)
      }
    })
    el.classList.add(highlightClass)
    // 气泡仍锚定主目标；挖洞可并入 includeTargets（建议浮层等）
    highlightEl.value = el
    coachSide.value = pickCoachSide(el)

    const extras = resolveIncludeEls()
    hole.value = extras.length
      ? unionHoleRect([el, ...extras])
      : (() => {
          const rect = el.getBoundingClientRect()
          return {
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }
        })()
  }

  async function waitForTarget(maxFrames = 45): Promise<HTMLElement | null> {
    for (let i = 0; i < maxFrames; i++) {
      const el = resolveTargetEl()
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          return el
        }
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
    return resolveTargetEl()
  }

  /** 等目标进场停稳后再挖洞，避免蒙层跟着重绘滑动 */
  async function waitForStableRect(el: HTMLElement, maxFrames = 40) {
    let last = el.getBoundingClientRect()
    let stable = 0
    for (let i = 0; i < maxFrames; i++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      const next = el.getBoundingClientRect()
      const moved =
        Math.abs(next.left - last.left) > 0.5 ||
        Math.abs(next.top - last.top) > 0.5 ||
        Math.abs(next.width - last.width) > 0.5 ||
        Math.abs(next.height - last.height) > 0.5
      last = next
      if (moved) {
        stable = 0
        continue
      }
      stable += 1
      if (stable >= 2) {
        return
      }
    }
  }

  let holeEpoch = 0

  async function updateHole() {
    const epoch = ++holeEpoch

    if (!tour.open.value) {
      clearHighlight()
      hole.value = null
      return
    }

    if (isCentered.value) {
      applyCentered()
      return
    }

    const el = await waitForTarget()
    if (epoch !== holeEpoch) {
      return
    }
    if (!el || !tour.open.value) {
      clearHighlight()
      hole.value = null
      return
    }

    await waitForStableRect(el)
    if (epoch !== holeEpoch || !tour.open.value || !el.isConnected) {
      return
    }

    // 一次到位；气泡位移由 CSS transform transition 平滑过渡
    applyHole(el)
  }

  async function goToStep(index: number) {
    tour.goTo(index)
    await nextTick()
    await updateHole()
  }

  if (import.meta.client) {
    watch([tour.open, tour.index], () => {
      nextTick(() => updateHole())
    })

    useEventListener(
      window,
      'resize',
      () => {
        if (!tour.open.value) {
          return
        }
        if (isCentered.value) {
          applyCentered()
          return
        }
        const el = resolveTargetEl()
        if (el) {
          applyHole(el)
        }
      },
      { passive: true },
    )

    useEventListener(
      window,
      'scroll',
      () => {
        if (!tour.open.value || isCentered.value) {
          return
        }
        const el = resolveTargetEl()
        if (el) {
          applyHole(el)
        }
      },
      { passive: true, capture: true },
    )

    // 建议浮层等 includeTargets 异步挂载/卸载时，扩缩挖洞
    let includeRaf = 0
    const includeObserver = new MutationObserver(() => {
      if (!tour.open.value || isCentered.value) {
        return
      }
      if (!currentStep.value?.includeTargets?.length) {
        return
      }
      cancelAnimationFrame(includeRaf)
      includeRaf = requestAnimationFrame(() => {
        const el = resolveTargetEl()
        if (el) {
          applyHole(el)
        }
      })
    })
    includeObserver.observe(document.body, { childList: true, subtree: true })

    onBeforeUnmount(() => {
      includeObserver.disconnect()
      cancelAnimationFrame(includeRaf)
      clearHighlight()
      hole.value = null
    })
  }

  return {
    ...tour,
    currentStep,
    requireAction,
    isCentered,
    hole,
    dimParts,
    highlightEl,
    coachSide,
    coachContent,
    updateHole,
    clearHighlight,
    goToStep,
    highlightClass,
  }
}
