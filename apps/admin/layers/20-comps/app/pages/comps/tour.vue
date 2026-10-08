<script setup lang="ts">
import type { MaybeElement } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import { unrefElement, useEventListener } from '@vueuse/core'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Tour',
})

const ctaRef = useTemplateRef('cta')
const cardRef = useTemplateRef('card')

const tour = useTour([
  {
    target: () => unrefElement(ctaRef),
    title: '开始使用',
    body: '点击这里创建你的第一个项目',
    side: 'bottom',
  },
  {
    target: () => unrefElement(cardRef),
    title: '个人资料',
    body: '在这里管理你的账户信息',
    side: 'right',
  },
  { target: null, title: '完成', body: '你已经了解了所有功能！' },
])

const PAD = 6
const hole = ref<{ top: number; left: number; width: number; height: number } | null>(null)

/** 四块遮罩拼出中间空洞，避免 SVG mask / box-shadow 的坐标系与层叠坑 */
const dimParts = computed(() => {
  if (!hole.value) {
    return [{ top: '0', left: '0', right: '0', bottom: '0' }]
  }

  const { top, left, width, height } = hole.value
  return [
    // 上
    { top: '0', left: '0', right: '0', height: `${Math.max(top, 0)}px` },
    // 下
    { top: `${top + height}px`, left: '0', right: '0', bottom: '0' },
    // 左
    { top: `${top}px`, left: '0', width: `${Math.max(left, 0)}px`, height: `${height}px` },
    // 右
    { top: `${top}px`, left: `${left + width}px`, right: '0', height: `${height}px` },
  ]
})

function clearHighlight() {
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'))
}

function updateHole() {
  clearHighlight()
  hole.value = null

  if (!tour.open.value) {
    return
  }

  const el = unrefElement(tour.reference as MaybeRefOrGetter<MaybeElement>)
  if (!(el instanceof HTMLElement)) {
    return
  }

  el.classList.add('tour-highlight')
  const rect = el.getBoundingClientRect()
  hole.value = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  }
}

if (import.meta.client) {
  watch(
    [tour.open, tour.index],
    () => {
      nextTick(updateHole)
    },
    { immediate: true },
  )

  useEventListener(window, 'resize', updateHole, { passive: true })
  useEventListener(window, 'scroll', updateHole, { passive: true, capture: true })
}
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Tour</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      基于 Nuxt UI
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">useTour</code> 的基础引导： 单气泡 +
      四块遮罩挖洞，锚点随步骤移动。
    </p>

    <div class="tour-demo">
      <UButton ref="cta" label="开始使用" @click="tour.start()" />

      <UCard ref="card" class="max-w-sm">
        <template #header> 个人资料卡片 </template>
        这是一段示例内容
      </UCard>

      <div>{{ tour.open.value }}</div>
    </div>
  </div>

  <Teleport to="body">
    <template v-if="tour.open.value">
      <div v-for="(part, i) in dimParts" :key="i" class="tour-dim" :style="part" />
    </template>
  </Teleport>

  <UPopover
    :open="tour.open.value"
    :reference="tour.reference.value"
    :dismissible="false"
    :ui="{ content: 'tour-popover' }"
  >
    <template #content>
      <div class="p-4 w-64 space-y-3">
        <p class="font-semibold">
          {{ tour.current.value?.title }}
        </p>
        <p class="text-sm text-muted">
          {{ tour.current.value?.body }}
        </p>

        <div class="flex justify-between items-center pt-2">
          <span class="text-xs text-muted">{{ tour.index.value + 1 }} / {{ tour.total.value }}</span>
          <div class="flex gap-2">
            <UButton v-if="tour.hasPrev.value" size="xs" variant="ghost" label="上一步" @click="tour.prev()" />
            <UButton
              size="xs"
              :label="tour.hasNext.value ? '下一步' : '完成'"
              @click="tour.hasNext.value ? tour.next() : tour.finish()"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<style>
.tour-demo {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
}

.tour-dim {
  position: fixed;
  z-index: 40;
  background: rgb(0 0 0 / 0.5);
  pointer-events: none;
}

/* 必须高于 .tour-dim(40)；写死 z-index，避免 Tailwind 未生成 */
.tour-popover {
  z-index: 100;
}

.tour-highlight {
  position: relative;
  z-index: 45;
  border-radius: 0.5rem;
  outline: 2px solid white;
  outline-offset: 4px;
}
</style>
