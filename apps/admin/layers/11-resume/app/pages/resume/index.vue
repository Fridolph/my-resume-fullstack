<script setup lang="ts">
/**
 * 简历概览（`/resume`）。
 *
 * 这一页回答"我有哪些简历"：右上角是新建入口，主体是列表 / 卡片两种呈现。
 * 单份简历的正文编辑在公开站的草稿工作台完成（`/resume/draft`），这里不做正文编辑；
 * 重命名与软删除属 **DAO-029**，所以本轮**不放行内操作的假按钮**。
 *
 * 布局用后台通用的 `has-sidebar`（主导航 + 页头），**不再叠 settings 那样的二级侧栏**：
 * 概览页只有一个入口层，二级导航只有两项（其中一项就是当前页），加了反而多一层点击。
 * 将来出现 `/resume/:id` 详情、版本历史等兄弟页面时，再决定要不要补回那一层。
 */
definePageMeta({
  layout: 'has-sidebar',
  title: '简历',
  middleware: 'auth',
})

const { summaries, status, error } = useResumeList()

type ResumeViewMode = 'card' | 'list'

/** 视图偏好记在本地：切一次就记住，下次进来保持（与 GS 的项目列表同一套做法） */
const VIEW_STORAGE_KEY = 'admin.resume-view'
const viewMode = ref<ResumeViewMode>('card')

onMounted(() => {
  const saved = localStorage.getItem(VIEW_STORAGE_KEY)
  if (saved === 'card' || saved === 'list') {
    viewMode.value = saved
  }
})

function setViewMode(mode: ResumeViewMode) {
  viewMode.value = mode
  localStorage.setItem(VIEW_STORAGE_KEY, mode)
}

const viewOptions = [
  { value: 'card' as const, icon: 'i-lucide-layout-grid', label: '卡片' },
  { value: 'list' as const, icon: 'i-lucide-list', label: '列表' },
]

const isLoading = computed(() => status.value === 'pending')
const hasError = computed(() => status.value === 'error')
const isEmpty = computed(() => status.value === 'success' && summaries.value.length === 0)

/**
 * 显式给出日期格式，不用 `toLocaleString()` 的默认选项：
 * 默认值在 SSR（Node）与浏览器之间可能不同步，会造成 hydration 警告。
 */
function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <!-- 页面标题由布局的页头按 `route.meta.title` 渲染，这里不再重复写一遍，直接给说明与操作 -->
      <p class="max-w-2xl text-sm leading-6 text-muted">
        这里是你名下的简历。新建后可在公开站的草稿工作台继续补充内容与展示配置。
      </p>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-0.5 rounded-lg border border-default p-0.5">
          <UButton
            v-for="option in viewOptions"
            :key="option.value"
            :icon="option.icon"
            size="xs"
            :color="viewMode === option.value ? 'primary' : 'neutral'"
            :variant="viewMode === option.value ? 'soft' : 'ghost'"
            :aria-label="`${option.label}视图`"
            :aria-pressed="viewMode === option.value"
            @click="setViewMode(option.value)"
          />
        </div>

        <UButton to="/resume/new" icon="i-lucide-plus" label="新建简历" />
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="index in 3" :key="index" :ui="{ body: 'p-5 sm:p-5' }">
        <USkeleton class="h-4 w-2/3" />
        <USkeleton class="mt-3 h-3 w-1/2" />
      </UCard>
    </div>

    <!-- 失败：请求层已按策略提示过，这里给就地重试的入口 -->
    <UAlert
      v-else-if="hasError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="简历列表加载失败"
      :description="error?.message ?? '请稍后重试'"
    />

    <!-- 空态 -->
    <UCard v-else-if="isEmpty" :ui="{ body: 'p-10 sm:p-10' }">
      <div class="flex flex-col items-center gap-3 text-center">
        <span class="grid size-12 place-items-center rounded-2xl bg-elevated text-muted">
          <UIcon name="i-lucide-file-plus-2" class="size-6" />
        </span>
        <p class="text-sm font-medium text-highlighted">还没有简历</p>
        <p class="max-w-md text-sm text-muted">
          从空白开始填一份：只填姓名也能创建，服务端会补成结构完整的草稿，其余内容随时再补。
        </p>
        <UButton class="mt-1" to="/resume/new" icon="i-lucide-plus" label="新建简历" />
      </div>
    </UCard>

    <!-- 卡片视图 -->
    <div v-else-if="viewMode === 'card'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="item in summaries" :key="item.id" :ui="{ body: 'p-5 sm:p-5' }">
        <div class="flex items-start justify-between gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-file-text" class="size-5" />
          </span>
          <UBadge color="neutral" variant="subtle" :label="`rev ${item.revision}`" />
        </div>

        <p class="mt-4 truncate font-medium text-highlighted">{{ item.name }}</p>
        <p class="mt-1 text-xs text-muted">{{ item.locale }} · 更新于 {{ formatUpdatedAt(item.updatedAt) }}</p>
      </UCard>
    </div>

    <!-- 列表视图 -->
    <div v-else class="divide-y divide-default overflow-hidden rounded-xl border border-default">
      <div v-for="item in summaries" :key="item.id" class="flex items-center gap-4 px-4 py-3">
        <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-muted" />

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">{{ item.name }}</p>
          <p class="text-xs text-muted">{{ item.locale }} · 更新于 {{ formatUpdatedAt(item.updatedAt) }}</p>
        </div>

        <UBadge color="neutral" variant="subtle" :label="`rev ${item.revision}`" />
      </div>
    </div>
  </div>
</template>
