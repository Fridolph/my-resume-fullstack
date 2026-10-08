<script setup lang="ts">
import type { ResumeThemePreset } from '~/composables/useResumeLayout'

/**
 * ResumeThemePanel —— 主题面板（参考 greensketch proposal/layout/ThemePanel）。
 *
 * - 顶部：预设主题卡片（对标 standard / vivid / silicon 三套模板，点击一键切换）
 * - 中部：主题色 / 渐变起止色（原生 <input type="color"> 微调，改完实时生效）
 */
defineProps<{
  width: number
  themeId: string
  presets: ResumeThemePreset[]
  themeColor: string
  gradientFrom: string
  gradientTo: string
}>()

const emit = defineEmits<{
  'apply-theme': [id: string]
  'update:themeColor': [value: string]
  'update:gradientFromColor': [value: string]
  'update:gradientToColor': [value: string]
}>()

const colors = ['#3ec064', '#1578d0', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#111827']
</script>

<template>
  <aside class="flex h-full flex-col bg-default" :style="{ width: `${width}px` }">
    <div class="shrink-0 border-b border-default px-4 pb-2 pt-4">
      <h3 class="text-sm font-semibold text-highlighted">主题</h3>
    </div>

    <div class="flex flex-col gap-5 overflow-y-auto p-4">
      <!-- 预设主题 -->
      <div>
        <p class="mb-2 text-sm font-medium">预设风格</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="flex flex-col gap-1.5 rounded-lg border p-2 text-left transition"
            :class="
              themeId === preset.id ? 'border-primary ring-1 ring-primary' : 'border-default hover:border-accented'
            "
            @click="emit('apply-theme', preset.id)"
          >
            <span
              class="flex h-8 w-full items-end justify-between rounded-md p-1.5"
              :style="{
                background: `linear-gradient(135deg, ${preset.gradientFrom}, ${preset.gradientTo})`,
              }"
            >
              <span class="size-2 rounded-full" :style="{ background: preset.themeColor }" />
              <span class="text-[10px] text-white/90">{{ preset.dark ? '深' : '浅' }}</span>
            </span>
            <span class="text-xs font-medium" :class="themeId === preset.id ? 'text-primary' : 'text-highlighted'">
              {{ preset.label }}
            </span>
            <span v-if="preset.description" class="text-[11px] leading-4 text-muted">{{ preset.description }}</span>
          </button>
        </div>
      </div>

      <!-- 主题色 -->
      <div>
        <p class="mb-2 text-sm font-medium">主题色</p>
        <div class="flex flex-wrap items-center gap-2">
          <label
            v-for="c in colors"
            :key="c"
            class="size-7 cursor-pointer rounded-full ring-2 ring-transparent transition hover:scale-105"
            :class="themeColor === c ? 'ring-primary' : ''"
            :style="{ background: c }"
          >
            <input
              type="radio"
              :value="c"
              :checked="themeColor === c"
              class="sr-only"
              @change="emit('update:themeColor', c)"
            />
          </label>
          <label class="relative size-7 cursor-pointer overflow-hidden rounded-full border border-default">
            <input
              :value="themeColor"
              type="color"
              class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              @input="emit('update:themeColor', ($event.target as HTMLInputElement).value)"
            />
            <span class="block size-full" :style="{ background: themeColor }" />
          </label>
        </div>
        <p class="mt-2 text-xs text-muted">
          当前：<code>{{ themeColor }}</code>
        </p>
      </div>

      <!-- 渐变 -->
      <div>
        <p class="mb-2 text-sm font-medium">渐变</p>
        <div class="flex flex-col gap-3">
          <div>
            <p class="mb-1 text-xs text-muted">起始色</p>
            <input
              :value="gradientFrom"
              type="color"
              class="h-9 w-full cursor-pointer rounded border border-default bg-default"
              @input="emit('update:gradientFromColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div>
            <p class="mb-1 text-xs text-muted">结束色</p>
            <input
              :value="gradientTo"
              type="color"
              class="h-9 w-full cursor-pointer rounded border border-default bg-default"
              @input="emit('update:gradientToColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <div
          class="mt-3 h-8 rounded"
          :style="{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }"
        />
      </div>
    </div>
  </aside>
</template>
