<script setup lang="ts">
import { useResumeLayout } from '~/composables/useResumeLayout'

/**
 * 布局编辑器 demo（参考 greensketch proposal 的布局配置能力）。
 *
 * 左侧图标条 + 可拖宽面板（布局 / 主题 / 敏感数据 / 导出），
 * 右侧实时预览；拖拽排序、显隐切换、主题色修改都会实时反映到预览，
 * 点「保存」持久化到 localStorage，点「取消」回到上次保存。
 */
definePageMeta({
  layout: 'demo',
  title: 'Layout editor',
})

const toast = useToast()

const layout = useResumeLayout()
const {
  sections,
  order,
  themeId,
  themePresets,
  themeColor,
  gradientFrom,
  gradientTo,
  effectiveSettings,
  infoOptions,
  exportOptions,
  isDirty,
  getSwitch,
  toggleSwitch,
  applyTheme,
  saveLayout,
  resetLayout,
} = layout

const panels = [
  { id: 'page-layout', icon: 'i-lucide-layout-list' },
  { id: 'page-theme', icon: 'i-lucide-palette', activeIcon: 'i-lucide-palette' },
  { id: 'page-sensitive-data', icon: 'i-lucide-shield-check' },
  { id: 'page-export', icon: 'i-lucide-file-text' },
]

const sidebarRef = useTemplateRef<{ toggle: () => void }>('sidebarRef')
const previewRef = useTemplateRef<HTMLElement>('previewRef')

function handleSave() {
  saveLayout()
  toast.add({
    title: '已保存',
    description: '布局配置已应用（localStorage 模拟后端）',
    color: 'success',
  })
}

function handleAction(key: string) {
  toast.add({
    title: '配置入口',
    description: `模块 ${key} 的配置面板（demo 占位）`,
    color: 'neutral',
  })
}

function scrollToModule(id: string) {
  const el = previewRef.value?.querySelector<HTMLElement>(`[data-module-id="${id}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.add('layout-highlight')
  setTimeout(() => el.classList.remove('layout-highlight'), 3000)
}

// 主题变量注入预览根节点
const themeVars = computed(() => ({
  '--resume-primary': themeColor.value,
  '--resume-gradient-from': gradientFrom.value,
  '--resume-gradient-to': gradientTo.value,
}))
</script>

<template>
  <div class="flex h-[calc(100dvh-3.5rem)] -mx-4 -my-6 sm:-mx-6">
    <!-- 左侧边栏 -->
    <ResumeLayoutSidebar ref="sidebarRef" :panels="panels" :collapse-below="768">
      <template #page-layout="{ width }">
        <ResumeLayoutPanel
          :sections="sections"
          v-model:order="order"
          :get-switch="getSwitch"
          :is-dirty="isDirty"
          :width="width"
          @toggle="toggleSwitch"
          @action="handleAction"
          @save="handleSave"
          @reset="resetLayout"
          @scroll-to="scrollToModule"
        />
      </template>

      <template #page-theme="{ width }">
        <ResumeThemePanel
          :width="width"
          :theme-id="themeId"
          :presets="themePresets"
          :theme-color="themeColor"
          :gradient-from="gradientFrom"
          :gradient-to="gradientTo"
          @apply-theme="applyTheme"
          @update:theme-color="themeColor = $event"
          @update:gradient-from-color="gradientFrom = $event"
          @update:gradient-to-color="gradientTo = $event"
        />
      </template>

      <template #page-sensitive-data="{ width }">
        <ResumeSwitchPanel
          :width="width"
          title="敏感数据"
          :get-switch="getSwitch"
          :options="infoOptions"
          @toggle="toggleSwitch"
        />
      </template>

      <template #page-export="{ width }">
        <ResumeSwitchPanel
          :width="width"
          title="导出"
          :get-switch="getSwitch"
          :options="exportOptions"
          @toggle="toggleSwitch"
        />
      </template>
    </ResumeLayoutSidebar>

    <!-- 预览 -->
    <div ref="previewRef" class="min-w-0 flex-1 overflow-y-auto bg-default p-6">
      <div class="mx-auto max-w-3xl" :style="themeVars">
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-muted">实时预览 · 拖拽/显隐/主题色即时生效</p>
          <span v-if="isDirty" class="rounded bg-warning/15 px-2 py-0.5 text-xs text-warning">未保存</span>
        </div>

        <!-- 模块卡片：按 order + 显隐渲染 -->
        <div class="flex flex-col gap-4">
          <template v-for="id in order" :key="id">
            <section
              v-if="getSwitch(sections.find(s => s.id === id)?.switchKey)"
              :data-module-id="id"
              class="rounded-lg border border-default bg-default p-4"
            >
              <!-- header 模块单独渲染（含敏感数据开关） -->
              <template v-if="id === 'header'">
                <div class="flex items-center justify-between">
                  <div>
                    <h1 class="text-xl font-bold text-highlighted">张三</h1>
                    <p class="text-sm text-muted">前端工程师</p>
                  </div>
                  <div
                    class="flex size-12 items-center justify-center rounded-full text-lg font-bold text-white"
                    :style="{
                      background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))`,
                    }"
                  >
                    张
                  </div>
                </div>
                <div v-if="getSwitch('contactSwitch')" class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span v-if="getSwitch('showPhoneSwitch')">📱 138-0000-0000</span>
                  <span v-if="getSwitch('showEmailSwitch')">📧 zhang@example.com</span>
                  <span>📍 杭州</span>
                  <span v-if="getSwitch('showAgeSwitch')">🎂 30 岁</span>
                </div>
              </template>

              <!-- 其余模块：标题 + 占位内容 -->
              <template v-else>
                <h2
                  class="mb-2 flex items-center gap-2 text-sm font-semibold"
                  :style="{ color: 'var(--resume-primary)' }"
                >
                  <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                  {{ sections.find(s => s.id === id)?.label }}
                </h2>
                <div class="space-y-2">
                  <div class="h-3 w-full rounded bg-muted/60" />
                  <div class="h-3 w-4/5 rounded bg-muted/60" />
                  <div class="h-3 w-3/5 rounded bg-muted/60" />
                </div>
              </template>
            </section>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-highlight {
  animation: layout-highlight 3s ease;
}

@keyframes layout-highlight {
  0%,
  40% {
    box-shadow: 0 0 0 2px var(--resume-primary, #3ec064);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}
</style>
