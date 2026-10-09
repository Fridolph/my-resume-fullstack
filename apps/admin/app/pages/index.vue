<script setup lang="ts">
import { normalizeApiError, resolveApiErrorMessage } from '@template/common'
import { fetchHealth } from '~/apis/health'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Dashboard',
})

const summary = [
  {
    label: 'Active projects',
    value: '24',
    change: '+12.5%',
    icon: 'i-lucide-folder-kanban',
    tone: 'text-primary',
  },
  {
    label: 'Team members',
    value: '18',
    change: '+4.2%',
    icon: 'i-lucide-users',
    tone: 'text-info',
  },
  {
    label: 'Open tasks',
    value: '62',
    change: '-8.1%',
    icon: 'i-lucide-list-checks',
    tone: 'text-warning',
  },
]

const recentActivity = [
  {
    title: 'Project brief approved',
    description: 'Northwind rollout',
    time: '12 min ago',
    icon: 'i-lucide-check-circle-2',
  },
  {
    title: 'New team member joined',
    description: 'Alex Morgan',
    time: '46 min ago',
    icon: 'i-lucide-user-plus',
  },
  {
    title: 'Review requested',
    description: 'Q4 campaign workspace',
    time: '2 hr ago',
    icon: 'i-lucide-message-square-more',
  },
]

/**
 * 数据层自检：colada query 打真实后端接口（/api/health）。
 * 换后端或加鉴权后，这里用来观察请求层 + 缓存层是否仍然成立。
 */
const {
  data: health,
  error: healthError,
  status: healthStatus,
  refresh: refreshHealthData,
} = await useAsyncData('health', fetchHealth)

const isHealthLoading = computed(() => healthStatus.value === 'pending')
const healthTone = computed(() =>
  healthError.value ? 'text-error' : isHealthLoading.value ? 'text-muted' : 'text-success',
)
const healthIcon = computed(() =>
  healthError.value
    ? 'i-lucide-triangle-alert'
    : isHealthLoading.value
      ? 'i-lucide-loader-circle'
      : 'i-lucide-plug-zap',
)
const healthSummary = computed(() => {
  if (isHealthLoading.value) {
    return 'Checking backend…'
  }
  if (healthError.value) {
    return healthError.value ? resolveApiErrorMessage(normalizeApiError(healthError.value)) : 'Backend unreachable'
  }
  return health.value
    ? `${health.value.service} online · uptime ${Math.round(health.value.uptime)}s`
    : 'Waiting for first check'
})
const healthRaw = computed(() =>
  health.value ? JSON.stringify(health.value) : healthError.value ? String(healthError.value) : '—',
)

/** 失效重取：演示 colada 的缓存失效与重新取数 */
function recheckHealth() {
  void refreshHealthData()
}
</script>

<template>
  <div class="m-2 lg:m-4 space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="text-sm font-medium text-primary">Monday, October 5, 2026</p>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">Good morning, admin.</h2>
        <p class="mt-2 text-sm text-muted">Here is what is happening across your workspace.</p>
      </div>
      <UButton icon="i-lucide-plus" label="New project" />
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <UCard v-for="item in summary" :key="item.label" :ui="{ body: 'p-5 sm:p-5' }">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm text-muted">{{ item.label }}</p>
            <p class="mt-3 text-3xl font-semibold tracking-tight text-highlighted">
              {{ item.value }}
            </p>
          </div>
          <span class="grid size-10 place-items-center rounded-xl bg-primary/10" :class="item.tone">
            <UIcon :name="item.icon" class="size-5" />
          </span>
        </div>
        <p class="mt-4 text-xs text-muted">
          <span class="font-medium text-success">{{ item.change }}</span> from last month
        </p>
      </UCard>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
      <UCard :ui="{ header: 'flex items-center justify-between gap-4', body: 'p-0 sm:p-0' }">
        <template #header>
          <div>
            <h3 class="font-semibold text-highlighted">Infrastructure check</h3>
            <p class="mt-1 text-sm text-muted">Pinia Colada query hitting the real API; invalidate to refetch.</p>
          </div>
          <UButton label="View report" color="neutral" variant="outline" size="sm" />
        </template>
        <div class="grid min-h-72 place-items-center bg-linear-to-br from-primary/5 via-default to-info/5 p-6">
          <div class="w-full max-w-md space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <UIcon :name="healthIcon" class="size-5" :class="healthTone" />
                <p class="text-sm font-medium text-highlighted">Backend /api/health</p>
              </div>
              <UButton
                label="Invalidate &amp; refetch"
                size="xs"
                color="neutral"
                variant="outline"
                :loading="isHealthLoading"
                @click="recheckHealth"
              />
            </div>
            <p class="text-sm text-muted">{{ healthSummary }}</p>
            <p class="break-all font-mono text-xs text-dimmed">{{ healthRaw }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <h3 class="font-semibold text-highlighted">Recent activity</h3>
            <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="xs" aria-label="Activity options" />
          </div>
        </template>
        <div class="space-y-5">
          <div v-for="activity in recentActivity" :key="activity.title" class="flex gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <UIcon :name="activity.icon" class="size-4" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">{{ activity.title }}</p>
              <p class="truncate text-sm text-muted">{{ activity.description }}</p>
              <p class="mt-1 text-xs text-dimmed">{{ activity.time }}</p>
            </div>
          </div>
        </div>
      </UCard>
    </section>
  </div>
</template>
