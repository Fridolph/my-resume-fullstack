<script setup lang="ts">
import type {
  SpotlightTourStep,
  TourSpotlightFooterConfig,
  TourSpotlightFooterSlotProps,
  TourSpotlightStepRegistration,
} from '~/composables/useSpotlightTour'
import { tourSpotlightKey } from '~/composables/useSpotlightTour'

/**
 * Spotlight 引导容器：
 * - 子组件 TourSpotlightStep 声明步骤（target / step / 内容 / #footer）
 * - 自动汇总为 useSpotlightTour 配置
 * - 整体 ClientOnly，避免 UPopover / Teleport 水合不一致
 */
const props = withDefaults(
  defineProps<{
    /** 打开时自动 start */
    autoStart?: boolean
    /** 默认底部栏配置；某步提供 #footer 时该步优先用自定义 */
    footer?: TourSpotlightFooterConfig
    dimClass?: string
    coachClass?: string
    zIndexDim?: number
  }>(),
  {
    autoStart: true,
    footer: () => ({}),
    dimClass: 'gs-tour-dim',
    coachClass: 'gs-tour-coach',
    zIndexDim: 100,
  },
)

const emit = defineEmits<{
  action: []
  'update:open': [value: boolean]
}>()

const FOOTER_DEFAULTS: Required<TourSpotlightFooterConfig> = {
  show: true,
  showStep: true,
  showAction: true,
  showHint: true,
  actionLabel: '下一步',
  actionDisabled: false,
  hintLabel: '请点击高亮区域',
}

const footerConfig = computed<Required<TourSpotlightFooterConfig>>(() => ({
  ...FOOTER_DEFAULTS,
  ...props.footer,
}))

const entries = ref<TourSpotlightStepRegistration[]>([])
let orderSeq = 0

function register(entry: TourSpotlightStepRegistration) {
  const next = {
    ...entry,
    order: orderSeq++,
  }
  entries.value = [...entries.value, next]
}

function unregister(id: string) {
  entries.value = entries.value.filter(e => e.id !== id)
}

function update(
  id: string,
  patch: Partial<Omit<TourSpotlightStepRegistration, 'id'>> & {
    getContent?: TourSpotlightStepRegistration['getContent']
    getFooter?: TourSpotlightStepRegistration['getFooter']
  },
) {
  entries.value = entries.value.map(e => (e.id === id ? { ...e, ...patch } : e))
}

const sortedEntries = computed(() =>
  [...entries.value].sort((a, b) => {
    const ka = a.step ?? a.order
    const kb = b.step ?? b.order
    if (ka !== kb) {
      return ka - kb
    }
    return a.order - b.order
  }),
)

const tourSteps = computed<SpotlightTourStep[]>(() =>
  sortedEntries.value.map(e => ({
    target: e.target,
    side: e.side,
    requireAction: e.requireAction,
    fallbackTarget: e.fallbackTarget,
    includeTargets: e.includeTargets,
  })),
)

const tour = useSpotlightTour(tourSteps)

const open = computed(() => tour.open.value)
const dimParts = computed(() => tour.dimParts.value)
const highlightEl = computed(() => tour.highlightEl.value)
const coachContent = computed(() => tour.coachContent.value)
const requireAction = computed(() => tour.requireAction.value)
const stepLabel = computed(() => `${tour.index.value + 1} / ${tour.total.value}`)

const footerSlotProps = computed<TourSpotlightFooterSlotProps>(() => ({
  index: tour.index.value,
  total: tour.total.value,
  stepLabel: stepLabel.value,
  requireAction: requireAction.value,
  isLast: tour.index.value >= tour.total.value - 1,
  footer: footerConfig.value,
  action: () => emit('action'),
}))

const activeId = computed(() => {
  if (!open.value) {
    return null
  }
  return sortedEntries.value[tour.index.value]?.id ?? null
})

provide(tourSpotlightKey, {
  register,
  unregister,
  update,
  activeId,
})

const currentEntry = computed(() => sortedEntries.value[tour.index.value])
const hasStepFooter = computed(() => !!currentEntry.value?.getFooter)

const coachOpen = computed(() => open.value && !!highlightEl.value)

const coachUi = computed(() => ({
  content: props.coachClass,
}))

const StepContent = defineComponent({
  name: 'TourSpotlightStepContent',
  setup() {
    return () => currentEntry.value?.getContent?.() ?? null
  },
})

const StepFooter = defineComponent({
  name: 'TourSpotlightStepFooter',
  setup() {
    return () => currentEntry.value?.getFooter?.(footerSlotProps.value) ?? null
  },
})

watch(open, value => {
  emit('update:open', value)
})

let started = false

async function tryAutoStart() {
  if (!props.autoStart || started || !import.meta.client) {
    return
  }
  if (tourSteps.value.length > 0) {
    started = true
    tour.start(0)
    await tour.updateHole()
  }
}

// ClientOnly 内子步骤在父 onMounted 之后才注册，需监听长度
watch(
  () => tourSteps.value.length,
  len => {
    if (len > 0) {
      tryAutoStart()
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  tryAutoStart()
})

defineExpose({
  open: tour.open,
  index: tour.index,
  total: tour.total,
  currentStep: tour.currentStep,
  requireAction: tour.requireAction,
  isCentered: tour.isCentered,
  highlightEl: tour.highlightEl,
  start: (...args: Parameters<typeof tour.start>) => {
    started = true
    return tour.start(...args)
  },
  finish: tour.finish,
  goTo: tour.goTo,
  goToStep: tour.goToStep,
  next: tour.next,
  prev: tour.prev,
  updateHole: tour.updateHole,
  clearHighlight: tour.clearHighlight,
})
</script>

<template>
  <!-- 避免 SSR 与客户端 UPopover/Teleport/挖洞 DOM 不一致 -->
  <ClientOnly>
    <div class="gs-tour-steps-root">
      <slot />
    </div>

    <Teleport to="body">
      <template v-if="open">
        <div v-for="(part, i) in dimParts" :key="i" :class="dimClass" :style="{ ...part, zIndex: zIndexDim }" />
      </template>
    </Teleport>

    <UPopover
      :open="coachOpen"
      :reference="highlightEl ?? undefined"
      :dismissible="false"
      :content="coachContent"
      :ui="coachUi"
    >
      <template #content>
        <div class="gs-tour-coach-body">
          <StepContent />

          <div v-if="footerConfig.show" class="gs-tour-coach-footer">
            <StepFooter v-if="hasStepFooter" />
            <template v-else>
              <span v-if="footerConfig.showStep" class="gs-tour-coach-step">{{ stepLabel }}</span>

              <span v-if="requireAction && footerConfig.showHint" class="gs-tour-coach-hint">{{
                footerConfig.hintLabel
              }}</span>
              <UButton
                v-else-if="!requireAction && footerConfig.showAction"
                size="xs"
                :label="footerConfig.actionLabel"
                :disabled="footerConfig.actionDisabled"
                @click="emit('action')"
              />
            </template>
          </div>
        </div>
      </template>
    </UPopover>
  </ClientOnly>
</template>

<style>
.gs-tour-steps-root {
  display: contents;
}

.gs-tour-dim {
  position: fixed;
  background: rgb(0 0 0 / 0.5);
  pointer-events: none;
}

/* Reka 把位移写在 wrapper 的 transform 上 */
[data-reka-popper-content-wrapper]:has(.gs-tour-coach) {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1) !important;
}

.gs-tour-coach {
  z-index: 200;
  max-width: calc(100vw - 1.5rem);
  /* 关掉进场/退场关键场动画，改由 transform transition 承担位移动效 */
  animation: none !important;
  transition: opacity 0.25s ease;
}

.gs-tour-coach-body {
  padding: 1rem;
  width: min(16rem, calc(100vw - 1.5rem));
  max-width: calc(100vw - 1.5rem);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gs-tour-coach-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.gs-tour-coach-step,
.gs-tour-coach-hint {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.gs-tour-highlight {
  position: relative;
  z-index: 105;
  border-radius: 0.5rem;
  outline: 2px solid white;
  outline-offset: 4px;
  transition: outline-offset 0.3s ease;
}
</style>
