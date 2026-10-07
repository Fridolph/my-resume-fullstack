<script setup lang="ts">
import { useResumeLayout } from '~/composables/useResumeLayout'
import { RESUME_CONTENT } from '~/config/resume-content'

/**
 * 简历综合配置展示页（参考 greensketch proposal 页的布局配置 + 主题模板能力）。
 *
 * 左侧：图标条 + 可拖宽面板（布局 / 主题 / 敏感数据 / 导出）
 * 右侧：真实简历内容实时预览
 * - 模块拖拽排序、显隐切换即时生效
 * - 预设主题一键切换（简约白 / 绿色清新 / 蓝色商务 / 深色科技）+ 颜色微调
 * - 点「保存」持久化到 localStorage
 */
definePageMeta({
  layout: 'demo',
  title: 'Resume config layout',
})

const toast = useToast()
const content = RESUME_CONTENT

const layout = useResumeLayout()
const {
  sections,
  sectionMap,
  themeId,
  themePresets,
  themePreset,
  order,
  themeColor,
  gradientFrom,
  gradientTo,
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

const previewRef = useTemplateRef<HTMLElement>('previewRef')

function handleSave() {
  saveLayout()
  toast.add({ title: '已保存', description: '布局与主题配置已应用（localStorage 模拟后端）', color: 'success' })
}

function handleAction(key: string) {
  toast.add({ title: '配置入口', description: `模块 ${key} 的配置面板（demo 占位）`, color: 'neutral' })
}

function scrollToModule(id: string) {
  const el = previewRef.value?.querySelector<HTMLElement>(`[data-module-id="${id}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.add('layout-highlight')
  setTimeout(() => el.classList.remove('layout-highlight'), 3000)
}

const themeVars = computed(() => ({
  '--resume-primary': themeColor.value,
  '--resume-gradient-from': gradientFrom.value,
  '--resume-gradient-to': gradientTo.value,
}))

const isDark = computed(() => themePreset.value.dark === true)
const paperClass = computed(() => isDark.value ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-default')
const headingClass = computed(() => isDark.value ? 'text-neutral-100' : 'text-neutral-900')
const mutedClass = computed(() => isDark.value ? 'text-neutral-400' : 'text-muted')
const chipClass = computed(() => isDark.value ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-700')

function labelOf(id: string) {
  return sectionMap.value[id]?.label ?? id
}
</script>

<template>
  <div class="flex h-[calc(100dvh-3.5rem)] -mx-4 -my-6 sm:-mx-6">
    <!-- 左侧配置侧栏 -->
    <ResumeLayoutSidebar :panels="panels" :collapse-below="768">
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

    <!-- 预览区 -->
    <div ref="previewRef" class="min-w-0 flex-1 overflow-y-auto p-6" :class="themePreset.bgClass">
      <div class="mx-auto max-w-3xl" :style="themeVars">
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm" :class="mutedClass">实时预览 · 拖拽/显隐/主题即时生效</p>
          <span v-if="isDirty" class="rounded bg-warning/15 px-2 py-0.5 text-xs text-warning">未保存</span>
        </div>

        <!-- 简历纸 -->
        <div class="rounded-lg border p-6 shadow-sm" :class="paperClass">
          <div class="flex flex-col gap-5">
            <template v-for="id in order" :key="id">
              <template v-if="getSwitch(sectionMap[id]?.switchKey)">
                <!-- 基本信息 -->
                <section v-if="id === 'header'" :data-module-id="id">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h1 class="text-2xl font-bold" :class="headingClass">{{ content.name }}</h1>
                      <p class="mt-0.5 text-sm" :class="mutedClass">{{ content.role }}</p>
                    </div>
                    <div
                      class="flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                      :style="{ background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))` }"
                    >
                      {{ content.avatar }}
                    </div>
                  </div>
                  <div
                    v-if="getSwitch('contactSwitch')"
                    class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm"
                    :class="mutedClass"
                  >
                    <span v-if="getSwitch('showPhoneSwitch')">📱 {{ content.phone }}</span>
                    <span v-if="getSwitch('showEmailSwitch')">📧 {{ content.email }}</span>
                    <span>📍 {{ content.location }}</span>
                    <span v-if="getSwitch('showAgeSwitch')">🎂 {{ content.age }} 岁</span>
                    <span>🌐 {{ content.website }}</span>
                  </div>
                </section>

                <!-- 个人概览 -->
                <section v-else-if="id === 'summary'" :data-module-id="id">
                  <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <p class="text-sm leading-6" :class="mutedClass">{{ content.summary }}</p>
                </section>

                <!-- 工作经历 -->
                <section v-else-if="id === 'experience'" :data-module-id="id">
                  <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <div class="space-y-4">
                    <div v-for="(item, i) in content.experience" :key="i" class="flex gap-3">
                      <div class="w-28 shrink-0 text-xs" :class="mutedClass">{{ item.period }}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium" :class="headingClass">{{ item.role }} · {{ item.company }}</p>
                        <p class="mt-1 text-sm leading-6" :class="mutedClass">{{ item.description }}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 项目经历 -->
                <section v-else-if="id === 'projects'" :data-module-id="id">
                  <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <div class="space-y-4">
                    <div v-for="(item, i) in content.projects" :key="i" class="flex gap-3">
                      <div class="w-28 shrink-0 text-xs" :class="mutedClass">{{ item.period }}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium" :class="headingClass">{{ item.name }} · {{ item.role }}</p>
                        <p class="mt-1 text-sm leading-6" :class="mutedClass">{{ item.description }}</p>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          <span v-for="t in item.tech" :key="t" class="rounded px-1.5 py-0.5 text-xs" :class="chipClass">{{ t }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 教育背景 -->
                <section v-else-if="id === 'education'" :data-module-id="id">
                  <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <div class="space-y-3">
                    <div v-for="(item, i) in content.education" :key="i" class="flex gap-3">
                      <div class="w-28 shrink-0 text-xs" :class="mutedClass">{{ item.period }}</div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium" :class="headingClass">{{ item.school }} · {{ item.degree }}</p>
                        <p class="mt-0.5 text-sm" :class="mutedClass">{{ item.major }}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 专业技能 / 证书 / 语言 / 兴趣（chip 类） -->
                <section v-else-if="id === 'skills'" :data-module-id="id">
                  <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="s in content.skills" :key="s" class="rounded px-2 py-1 text-xs" :class="chipClass">{{ s }}</span>
                  </div>
                </section>

                <section v-else-if="id === 'certificates'" :data-module-id="id">
                  <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <ul class="list-inside list-disc space-y-1 text-sm" :class="mutedClass">
                    <li v-for="c in content.certificates" :key="c">{{ c }}</li>
                  </ul>
                </section>

                <section v-else-if="id === 'languages'" :data-module-id="id">
                  <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="l in content.languages" :key="l.lang" class="rounded px-2 py-1 text-xs" :class="chipClass">{{ l.lang }} · {{ l.level }}</span>
                  </div>
                </section>

                <section v-else-if="id === 'hobbies'" :data-module-id="id">
                  <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--resume-primary)' }">
                    <span class="inline-block size-1.5 rounded-full" :style="{ background: 'var(--resume-primary)' }" />
                    {{ labelOf(id) }}
                  </h2>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="h in content.hobbies" :key="h" class="rounded px-2 py-1 text-xs" :class="chipClass">{{ h }}</span>
                  </div>
                </section>
              </template>
            </template>
          </div>
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
  0%, 40% {
    box-shadow: 0 0 0 2px var(--resume-primary, #3ec064);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}
</style>
