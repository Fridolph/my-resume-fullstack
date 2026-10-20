<script setup lang="ts">
import { normalizeApiError, resolveApiErrorMessage } from '@rs/common'
import { createResumeApi } from '../../../apis/resume'

/**
 * 简历详情（`/resume/:id`）：**只读预览**。
 *
 * 用共享展示层渲染这份简历的实际内容（与公开站同一套组件），便于在后台核对"创建/编辑后的样子"。
 * 想改内容去 `/resume/:id/edit`（本页右上角有入口）；本页不做编辑，也不做拖拽。
 */
definePageMeta({
  layout: 'has-sidebar',
  title: '简历详情',
  middleware: 'auth',
})

const route = useRoute()
const api = createResumeApi()
const resumeId = computed(() => Number(route.params.id))

const {
  data: draft,
  error: loadError,
  status: loadStatus,
} = await useAsyncData(
  () => `resume-preview-${route.params.id}`,
  () => api.getDraft(resumeId.value),
)

const isLoading = computed(() => loadStatus.value === 'pending')
const loadMessage = computed(() => {
  if (!loadError.value) return ''
  return resolveApiErrorMessage(normalizeApiError(loadError.value))
})
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <p class="max-w-2xl text-sm leading-6 text-muted">
        这是这份简历当前内容的只读预览（与公开站同一套渲染）。要修改内容，进编辑页。
      </p>

      <div class="flex items-center gap-2">
        <UButton to="/resume" color="neutral" variant="ghost" icon="i-lucide-arrow-left" label="返回列表" />
        <UButton :to="`/resume/${resumeId}/edit`" icon="i-lucide-pencil" label="编辑" />
        <!-- PDF 预览：管理侧能打所有简历（含未发布草稿） -->
        <UButton
          :to="`/resume/${resumeId}/pdf`"
          icon="i-lucide-printer"
          color="neutral"
          variant="outline"
          label="PDF 预览"
        />
      </div>
    </header>

    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="读取失败"
      :description="loadMessage"
    />

    <template v-else-if="isLoading">
      <UCard :ui="{ body: 'p-5 sm:p-5' }">
        <USkeleton class="h-64 w-full" />
      </UCard>
    </template>

    <template v-else-if="draft">
      <UCard :ui="{ body: 'p-4 sm:p-5' }">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-eye" class="size-4 text-muted" />
              <h3 class="text-sm font-semibold text-highlighted">{{ draft.resume.name }}</h3>
            </div>
            <p class="text-xs text-muted">
              V{{ draft.document.schemaVersion }} · rev {{ draft.revision }} · {{ draft.resume.locale }}
            </p>
          </div>
        </template>

        <ResumePreview :document="draft.document" />
      </UCard>
    </template>
  </div>
</template>
