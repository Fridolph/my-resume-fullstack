<script setup lang="ts">
import ResumePdfConfigPanel from '#layers/ui/app/components/pdf/resume/ResumePdfConfigPanel.vue'
import { usePrintPreset } from '../../composables/usePrintPreset'

const {
  draft,
  saved,
  loaded,
  busy,
  error,
  message,
  invalid,
  validationMessage,
  dirty,
  load,
  save,
  reset,
  discard,
  reload,
} = usePrintPreset()
onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6 pb-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">简历设置</p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">PDF 与打印预设</h1>
        <p class="max-w-2xl text-sm leading-6 text-muted">
          为本人新增的简历设置统一纸面样式。每份简历创建后独立保存，也可在 PDF 预览中继续调整。
        </p>
      </div>
      <UButton to="/resume/new" label="新建简历" icon="i-lucide-plus" color="neutral" variant="outline" />
    </header>

    <p v-if="busy && !loaded" role="status" class="text-sm text-muted">正在读取打印预设…</p>
    <div v-if="error" role="alert" class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
      <p>{{ error }}</p>
      <UButton class="mt-3" label="重新读取" color="neutral" variant="outline" :disabled="busy" @click="reload" />
    </div>

    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-semibold text-highlighted">默认纸面配置</h2>
            <UBadge v-if="loaded" :color="dirty ? 'warning' : 'neutral'" variant="subtle">
              {{ dirty ? '有未保存修改' : saved ? '已保存的公共预设' : '当前使用系统默认' }}
            </UBadge>
          </div>
        </template>

        <form id="print-preset-form" class="space-y-4" novalidate @submit.prevent="save">
          <p v-if="loaded && invalid" role="alert" class="text-sm text-error">{{ validationMessage }}</p>
          <ResumePdfConfigPanel v-model="draft" :disabled="busy || !loaded" />
        </form>

        <template #footer>
          <div class="space-y-3">
            <p v-if="message && !dirty" role="status" class="text-sm text-success">{{ message }}</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                type="submit"
                form="print-preset-form"
                label="保存打印预设"
                icon="i-lucide-save"
                :loading="busy"
                :disabled="!loaded || busy || invalid || (!dirty && saved !== null)"
              />
              <UButton label="放弃修改" color="neutral" variant="outline" :disabled="busy || !dirty" @click="discard" />
              <UButton label="重新读取" color="neutral" variant="ghost" :disabled="busy" @click="reload" />
            </div>
          </div>
        </template>
      </UCard>

      <aside class="space-y-4">
        <UCard>
          <h2 class="font-semibold text-highlighted">如何生效</h2>
          <ul class="mt-3 list-disc space-y-3 pl-4 text-sm leading-6 text-muted">
            <li>保存后，本人之后新建的简历采用此预设。</li>
            <li>已有简历保持独立，修改公共预设不会覆盖它们。</li>
            <li>复制简历时，优先保留源简历已保存的 PDF 配置。</li>
            <li>模块排序与显隐，在各份简历的 PDF 预览中设置。</li>
          </ul>
        </UCard>
        <UCard>
          <h2 class="font-semibold text-highlighted">恢复系统默认</h2>
          <p class="mt-2 text-sm leading-6 text-muted">先恢复到默认值，再点击保存，才会更新公共预设。</p>
          <UButton
            class="mt-4"
            label="恢复系统默认"
            color="neutral"
            variant="outline"
            :disabled="busy || !loaded"
            @click="reset"
          />
        </UCard>
      </aside>
    </div>
  </div>
</template>
