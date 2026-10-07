<script setup lang="ts">
import type { MaybeElement } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import { unrefElement } from '@vueuse/core'

/**
 * 声明式 TourSpotlight + TourSpotlightStep 演示：
 * - 有 target → 挖洞高亮
 * - includeTargets → 建议浮层并入挖洞
 * - 无 target → 居中引导
 * - TourSpotlightStep #footer → 单步自定义底部
 */
/** 显式标注 expose，避免 useTemplateRef 与模板 ref 循环推断出 any */
interface TourSpotlightExposed {
  open: MaybeRefOrGetter<boolean>
  index: MaybeRefOrGetter<number>
  start: (index?: number) => void
  finish: () => void
  goToStep: (index: number) => void | Promise<void>
  updateHole: () => void | Promise<void>
  clearHighlight: () => void
}

definePageMeta({
  layout: 'has-sidebar',
  title: 'Tour spotlight',
})

const startBtnRef = useTemplateRef('startBtn')
const tourRef = useTemplateRef<TourSpotlightExposed>('tour')
const menuOpen = ref(false)
const slideOpen = ref(false)
const nameInput = ref<string | undefined>()
const suggestOpen = ref(false)

const nameSuggestions = ['张三', '李四', '王五', '赵六', '陈七']

const menuReference = computed(() =>
  unrefElement(startBtnRef as MaybeRefOrGetter<MaybeElement>) ?? undefined,
)

/** template ref 上的 expose ref 会被自动解包，统一用 unref */
const tourIndex = computed(() => unref(tourRef.value?.index) ?? 0)
const tourOpen = computed(() => !!unref(tourRef.value?.open))

const hasName = computed(() => !!String(nameInput.value ?? '').trim())

const filteredSuggestions = computed(() => {
  const q = String(nameInput.value ?? '').trim()
  return nameSuggestions.filter(s => !q || s.includes(q))
})

const coachActionLabel = computed(() => {
  if (tourIndex.value === 2) {
    return hasName.value ? '下一步' : '请先选择或输入'
  }
  if (tourIndex.value === 4) {
    return '完成'
  }
  return '下一步'
})

const coachActionDisabled = computed(() => tourIndex.value === 2 && !hasName.value)

async function onStartClick() {
  if (tourOpen.value && tourIndex.value === 0) {
    menuOpen.value = true
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await tourRef.value?.goToStep(1)
    return
  }

  if (!tourOpen.value) {
    menuOpen.value = !menuOpen.value
  }
}

async function onMenuItemClick() {
  menuOpen.value = false
  slideOpen.value = true

  if (tourOpen.value && tourIndex.value === 1) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await tourRef.value?.goToStep(2)
  }
}

async function onCoachAction() {
  if (tourIndex.value === 2) {
    if (!hasName.value) {
      return
    }
    suggestOpen.value = false
    await tourRef.value?.goToStep(3)
    return
  }

  if (tourIndex.value === 3) {
    await tourRef.value?.goToStep(4)
    return
  }

  if (tourIndex.value === 4) {
    tourRef.value?.finish()
    tourRef.value?.clearHighlight()
  }
}

async function onCustomFooterPrev() {
  await tourRef.value?.goToStep(2)
}

async function onCustomFooterSkip() {
  await tourRef.value?.goToStep(4)
}

/** 点选建议项：写入姓名并更新挖洞（建议层会随之收起） */
async function onNameSelect(value: string) {
  nameInput.value = value
  suggestOpen.value = false
  if (tourOpen.value && tourIndex.value === 2) {
    await nextTick()
    await tourRef.value?.updateHole()
  }
}

function onNameInput() {
  suggestOpen.value = true
}

// 延迟关闭，让建议项的 mousedown 先于 blur 触发
function onNameBlur() {
  setTimeout(() => {
    suggestOpen.value = false
  }, 150)
}

function restartTour() {
  nameInput.value = undefined
  suggestOpen.value = false
  menuOpen.value = false
  slideOpen.value = false
  nextTick(async () => {
    tourRef.value?.start(0)
    await tourRef.value?.updateHole()
  })
}

if (import.meta.client) {
  watch(menuOpen, async (open) => {
    if (open && tourOpen.value && tourIndex.value === 1) {
      await nextTick()
      await tourRef.value?.updateHole()
    }
  })

  watch(slideOpen, async (open) => {
    if (open && tourOpen.value && tourIndex.value === 2) {
      await nextTick()
      await tourRef.value?.updateHole()
    }
  })
}
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Tour spotlight</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      声明式
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">TourSpotlight</code> +
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">TourSpotlightStep</code>
      的挖洞引导：点击入口 → 操作菜单 → 侧边栏输入 → 自定义底部 → 完成。
    </p>

    <div class="spotlight-demo">
      <UButton label="重新开始引导" variant="outline" size="sm" @click="restartTour" />

      <UButton
        id="spotlight-start-btn"
        ref="startBtn"
        label="开始使用"
        @click="onStartClick"
      />

      <UPopover
        :open="menuOpen"
        :reference="menuReference"
        :dismissible="false"
        :ui="{ content: 'spotlight-menu-panel' }"
      >
        <template #content>
          <div id="spotlight-menu" class="spotlight-menu">
            <p class="spotlight-menu-hint">
              选择一项操作
            </p>
            <button type="button" class="spotlight-menu-item" @click="onMenuItemClick">
              填写资料
            </button>
          </div>
        </template>
      </UPopover>
    </div>
  </div>

  <USlideover
    v-model:open="slideOpen"
    title="填写资料"
    description="请完善以下信息"
    :dismissible="false"
    :modal="false"
    :overlay="false"
    :ui="{ content: 'spotlight-slide-panel' }"
  >
    <template #body>
      <div id="spotlight-input" class="spotlight-input-wrap">
        <UFormField label="姓名">
          <UInput
            id="spotlight-name-field"
            v-model="nameInput"
            placeholder="输入姓名"
            size="lg"
            autocomplete="off"
            @input="onNameInput"
            @blur="onNameBlur"
          />
        </UFormField>

        <!--
          建议层渲染在输入框下方（绝对定位）。includeTargets 把它与输入框一起纳入挖洞，
          演示「气泡锚定主目标、挖洞并入悬浮层」的能力。
        -->
        <div v-if="suggestOpen && filteredSuggestions.length" class="spotlight-name-suggestions">
          <button
            v-for="s in filteredSuggestions"
            :key="s"
            type="button"
            class="spotlight-menu-item"
            @mousedown.prevent="onNameSelect(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="ghost"
          label="取消"
          @click="slideOpen = false"
        />
        <UButton
          label="下一步"
          :disabled="!hasName || tourIndex !== 2"
          @click="onCoachAction"
        />
      </div>
    </template>
  </USlideover>

  <Teleport to="body">
    <div v-if="slideOpen" class="spotlight-slide-overlay" />
  </Teleport>

  <TourSpotlight
    ref="tour"
    :footer="{
      actionLabel: coachActionLabel,
      actionDisabled: coachActionDisabled,
    }"
    @action="onCoachAction"
  >
    <TourSpotlightStep target="#spotlight-start-btn" :step="1" side="bottom" require-action>
      <p class="gs-tour-coach-title">
        创建入口
      </p>
      <p class="gs-tour-coach-text">
        点击这个按钮，打开操作菜单。
      </p>
    </TourSpotlightStep>

    <TourSpotlightStep
      target="#spotlight-menu"
      :step="2"
      side="right"
      require-action
      fallback-target=".spotlight-menu"
    >
      <p class="gs-tour-coach-title">
        操作菜单
      </p>
      <p class="gs-tour-coach-text">
        点击「填写资料」，打开侧边栏。
      </p>
    </TourSpotlightStep>

    <TourSpotlightStep
      target="#spotlight-input"
      :step="3"
      side="left"
      :include-targets="['.spotlight-name-suggestions']"
    >
      <p class="gs-tour-coach-title">
        填写信息
      </p>
      <p class="gs-tour-coach-text">
        输入姓名会出现建议；点击某一项即可进入下一步。
      </p>
    </TourSpotlightStep>

    <TourSpotlightStep :step="4">
      <p class="gs-tour-coach-title">
        自定义底部示例
      </p>
      <p class="gs-tour-coach-text">
        本步在 TourSpotlightStep 上用 #footer 自定义底部：上一步 / 跳过 / 继续。
      </p>

      <template #footer="{ stepLabel, action }">
        <div class="spotlight-custom-footer">
          <UButton
            size="xs"
            variant="ghost"
            label="上一步"
            @click="onCustomFooterPrev"
          />
          <span class="gs-tour-coach-step">{{ stepLabel }} · 自定义</span>
          <div class="spotlight-custom-footer-actions">
            <UButton
              size="xs"
              variant="soft"
              label="跳过"
              @click="onCustomFooterSkip"
            />
            <UButton
              size="xs"
              label="继续"
              @click="action"
            />
          </div>
        </div>
      </template>
    </TourSpotlightStep>

    <TourSpotlightStep :step="5">
      <p class="gs-tour-coach-title">
        引导完成
      </p>
      <p class="gs-tour-coach-text">
        你已经了解了基本流程。点击完成结束引导，侧边栏会保持打开。
      </p>
    </TourSpotlightStep>
  </TourSpotlight>
</template>

<style>
.spotlight-demo {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
}

.spotlight-menu-panel {
  z-index: 90;
  padding: 0;
}

.spotlight-menu {
  width: min(14rem, calc(100vw - 2rem));
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spotlight-menu-hint {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  padding: 0 0.25rem;
}

.spotlight-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  background: color-mix(in oklab, var(--ui-primary) 10%, transparent);
  cursor: pointer;
  border: none;
}

.spotlight-menu-item:hover {
  background: color-mix(in oklab, var(--ui-primary) 18%, transparent);
}

.spotlight-slide-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgb(0 0 0 / 0.1);
  backdrop-filter: blur(12px);
}

.spotlight-slide-panel {
  z-index: 91;
}

.spotlight-input-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: 0.5rem;
}

/* 建议层：浮在输入框下方，z-index 高于挖洞蒙层(100)，并纳入 includeTargets */
.spotlight-name-suggestions {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 110;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  box-shadow: var(--ui-shadow);
}

.gs-tour-coach-title {
  font-weight: 600;
}

.gs-tour-coach-text {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}

.spotlight-custom-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
}

.spotlight-custom-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
</style>
