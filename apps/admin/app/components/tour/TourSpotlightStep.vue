<script setup lang="ts">
import type { SpotlightTourSide, TourSpotlightFooterSlotProps } from '~/composables/useSpotlightTour'
import { tourSpotlightKey } from '~/composables/useSpotlightTour'

/**
 * 声明式引导步骤。放在 TourSpotlight 内：
 * - target 省略 / null → 居中引导
 * - step 省略 → 按书写顺序排序
 * - includeTargets：额外纳入挖洞（如建议浮层）
 * - #footer：本步自定义底部；不传则用 TourSpotlight 的 footer 配置
 * - 仅在客户端 mounted 后注册，避免 SSR 阶段改写父状态
 */
const props = withDefaults(
  defineProps<{
    target?: string | null
    step?: number
    side?: SpotlightTourSide
    requireAction?: boolean
    fallbackTarget?: string
    /** 额外挖洞目标，如 InputMenu 建议列表选择器 */
    includeTargets?: string[]
  }>(),
  {
    target: null,
    requireAction: false,
    includeTargets: () => [],
  },
)

defineSlots<{
  default?: () => unknown
  /** 本步自定义底部；作用域参数见 TourSpotlightFooterSlotProps */
  footer?: (props: TourSpotlightFooterSlotProps) => unknown
}>()

const ctx = inject(tourSpotlightKey, null)
if (import.meta.dev && !ctx) {
  console.warn('[TourSpotlightStep] 必须放在 <TourSpotlight> 内使用')
}

const slots = useSlots()
const id = useId()
let registered = false

function getContent() {
  return slots.default?.()
}

function getFooter(slotProps: TourSpotlightFooterSlotProps) {
  return slots.footer?.(slotProps)
}

function syncRegister() {
  if (!ctx || !import.meta.client) {
    return
  }
  const payload = {
    id,
    order: 0,
    step: props.step,
    target: props.target ?? null,
    side: props.side,
    requireAction: props.requireAction,
    fallbackTarget: props.fallbackTarget,
    includeTargets: props.includeTargets,
    getContent,
    getFooter: slots.footer ? getFooter : undefined,
  }
  if (!registered) {
    ctx.register(payload)
    registered = true
  } else {
    ctx.update(id, {
      step: props.step,
      target: props.target ?? null,
      side: props.side,
      requireAction: props.requireAction,
      fallbackTarget: props.fallbackTarget,
      includeTargets: props.includeTargets,
      getContent,
      getFooter: slots.footer ? getFooter : undefined,
    })
  }
}

onMounted(() => {
  syncRegister()
})

watch(
  () =>
    [props.target, props.step, props.side, props.requireAction, props.fallbackTarget, props.includeTargets] as const,
  () => {
    if (registered) {
      syncRegister()
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (registered) {
    ctx?.unregister(id)
    registered = false
  }
})
</script>

<!-- headless：不渲染 DOM；default / footer 插槽由父组件消费 -->
<script lang="ts">
export default {
  render: () => null,
}
</script>
