<script setup lang="ts">
import type { ResumeSectionProps } from '../../types/resume'

/**
 * 基本信息卡片（左侧信息栏）。
 *
 * 只消费 `content.profile` 与展示开关：电话 / 邮箱 / 地点 / 年限可按开关隐藏，
 * 学历属于身份信息，恒定展示。
 */
const props = defineProps<ResumeSectionProps>()

const visibleContact = computed(() =>
  props.content.profile.contact.filter((item) => {
    if (item.key === 'phone') return props.options.showPhone
    if (item.key === 'email') return props.options.showEmail
    if (item.key === 'location') return props.options.showLocation
    if (item.key === 'years') return props.options.showYears
    return true
  }),
)
</script>

<template>
  <section
    class="rounded-2xl border p-5"
    :style="{ background: 'var(--resume-surface)', borderColor: 'var(--resume-border)' }"
  >
    <div class="flex items-center gap-4">
      <span
        class="grid size-16 shrink-0 place-items-center rounded-2xl text-xl font-semibold text-white"
        :style="{
          background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))`,
        }"
      >
        {{ content.profile.avatarText || content.profile.name.slice(0, 1) }}
      </span>
      <div class="min-w-0">
        <h1 class="truncate text-lg font-semibold tracking-tight" :style="{ color: 'var(--resume-text)' }">
          {{ content.profile.name }}
        </h1>
        <p class="mt-0.5 text-sm" :style="{ color: 'var(--resume-primary)' }">
          {{ content.profile.headline }}
        </p>
      </div>
    </div>

    <p class="mt-4 text-sm leading-6" :style="{ color: 'var(--resume-muted)' }">
      {{ content.profile.summary }}
    </p>

    <dl class="mt-4 space-y-2 border-t pt-4 text-sm" :style="{ borderColor: 'var(--resume-border)' }">
      <div v-for="item in visibleContact" :key="item.key" class="flex items-start gap-2">
        <UIcon :name="item.icon" class="mt-0.5 size-4 shrink-0" :style="{ color: 'var(--resume-primary)' }" />
        <dt class="sr-only">{{ item.label }}</dt>
        <dd class="min-w-0 break-all" :style="{ color: 'var(--resume-muted)' }">{{ item.value }}</dd>
      </div>
    </dl>
  </section>
</template>
