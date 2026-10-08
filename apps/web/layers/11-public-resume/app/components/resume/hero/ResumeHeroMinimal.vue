<script setup lang="ts">
import type { ResumeHeroProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'

/**
 * hero · 极简：文本方块 + 姓名 / 定位 / 概述 / 信息列表。
 *
 * 三档实现之一（外层契约与卡片外壳见 `ResumeHeroCard.vue`）。
 * 数据走 `useHero`（与另两档同一入口）；本档不需要头像翻牌 / 打字机 / 兴趣墙等零件。
 */
const props = defineProps<ResumeHeroProps>()
const { profile, avatarText, visibleContact } = useHero(props)
</script>

<template>
  <div class="flex items-center gap-4">
    <span
      class="grid size-16 shrink-0 place-items-center rounded-2xl text-xl font-semibold text-white"
      :style="{
        background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))`,
      }"
    >
      {{ avatarText }}
    </span>
    <div class="min-w-0">
      <h1 class="resume-text truncate text-lg font-semibold tracking-tight">
        {{ profile.name }}
      </h1>
      <p class="resume-accent mt-0.5 text-sm">
        {{ profile.headline }}
      </p>
    </div>
  </div>

  <p class="resume-muted mt-4 text-sm leading-6">
    {{ profile.summary }}
  </p>

  <dl class="mt-4 space-y-2 border-t pt-4 text-sm" :style="{ borderColor: 'var(--resume-border)' }">
    <div v-for="item in visibleContact" :key="item.key" class="flex items-start gap-2">
      <UIcon :name="item.icon" class="resume-accent mt-0.5 size-4 shrink-0" />
      <dt class="sr-only">{{ item.label }}</dt>
      <dd class="resume-muted min-w-0 break-all">{{ item.value }}</dd>
    </div>
  </dl>
</template>
