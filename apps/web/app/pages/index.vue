<script setup lang="ts">
import { normalizeApiError, resolveApiErrorMessage } from '@rs/common'
import { fetchHealth } from '~/apis/health'

definePageMeta({
  title: 'my-resume',
})

/**
 * 公开站入口：只做导航与后端状态，不承载业务。
 *
 * 心跳是"每次都要最新"的一类 → `useAsyncData`（SSR 直出 + 可手动刷新），**不进缓存**；
 * 真正"频繁但不常变"的数据（简历 / 用户信息）才用 `useQuery`。
 */
const {
  data: health,
  error: healthError,
  status,
  refresh: refreshHealthData,
} = await useAsyncData('health', fetchHealth)

const apiStatusLabel = computed(() => {
  if (status.value === 'pending') {
    return '检测中'
  }
  return healthError.value ? '离线' : '已连接'
})
const apiStatusColor = computed(() =>
  healthError.value ? 'bg-error' : status.value === 'pending' ? 'bg-warning' : 'bg-success',
)

/** 手动重取（心跳不进缓存，所以这里是"重新请求"而不是"失效缓存"） */
function refreshHealth() {
  void refreshHealthData()
}

const entries = [
  {
    label: '公开简历',
    description: '展示域：语言与主题切换、公开内容渲染',
    to: '/resume',
    icon: 'i-lucide-file-text',
  },
  {
    label: 'AI 对话',
    description: '访客对话：简历问答与线索收集',
    to: '/ai-talk',
    icon: 'i-lucide-messages-square',
  },
]
</script>

<template>
  <main class="min-h-screen bg-linear-to-br from-primary-50 via-default to-default px-6 py-16 dark:from-primary-950/40">
    <div class="mx-auto max-w-4xl space-y-10">
      <header class="space-y-4">
        <UBadge color="primary" variant="subtle">my-resume · Nuxt 4 实现场</UBadge>
        <h1 class="text-4xl font-bold tracking-tight text-highlighted sm:text-6xl">个人简历站</h1>
        <p class="max-w-2xl text-lg text-muted">
          Nuxt 4 + Nuxt UI + Pinia Colada 前端，NestJS + PostgreSQL + Redis 后端；功能按模块逐个落地。
        </p>
      </header>

      <section class="grid gap-4 sm:grid-cols-2">
        <UCard v-for="item in entries" :key="item.to">
          <NuxtLink :to="item.to" class="flex gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="item.icon" class="size-5" />
            </span>
            <span class="min-w-0">
              <span class="block font-medium text-highlighted">{{ item.label }}</span>
              <span class="mt-1 block text-sm text-muted">{{ item.description }}</span>
            </span>
            <UIcon name="i-lucide-arrow-right" class="ml-auto size-4 shrink-0 text-dimmed" />
          </NuxtLink>
        </UCard>
      </section>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <h2 class="font-semibold text-highlighted">后端状态</h2>
            <UButton icon="i-lucide-refresh-cw" variant="ghost" size="sm" label="失效重取" @click="refreshHealth" />
          </div>
        </template>
        <div class="flex flex-wrap items-center gap-3">
          <span class="size-3 rounded-full" :class="apiStatusColor" />
          <span>API 心跳：{{ apiStatusLabel }}</span>
          <span v-if="health" class="text-xs text-dimmed">
            {{ health.service }} · uptime {{ Math.round(health.uptime) }}s
          </span>
          <span v-else-if="healthError" class="text-xs text-dimmed">
            {{ healthError ? resolveApiErrorMessage(normalizeApiError(healthError)) : '后端不可达' }}
          </span>
        </div>
      </UCard>
    </div>
  </main>
</template>
