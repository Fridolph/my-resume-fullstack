<script setup lang="ts">
import type { Resume } from '~/config/resume-demo'
import { RESUMES, RESUME_COMPARE_FIELDS } from '~/config/resume-demo'

/**
 * 对比对话框 demo（参考 greensketch OptionCompareModal）。
 *
 * - PC 一次最多 4 列（超出左右翻页），移动端左右两份下拉
 * - 字段由 `RESUME_COMPARE_FIELDS` 配置驱动：分组标题 + 数据行 + `best: min|max` 最优高亮
 * - 完全数据无关：把 options 换成任意对象数组、fields 换成任意字段即可复用
 */
definePageMeta({
  layout: 'demo',
  title: 'Compare modal',
})

const open = ref(false)
const resumes = ref<Resume[]>(RESUMES)
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-highlighted">差异对比对话框</h1>
      <p class="mt-1 text-sm text-muted">
        对应 greensketch OptionCompareModal：多份对象逐字段对比，最优项自动高亮（渐变 + 奖杯）。
      </p>
    </div>

    <div class="rounded-lg border border-default bg-default p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-highlighted">共 {{ resumes.length }} 份简历版本</p>
          <p class="mt-1 text-sm text-muted">
            字段配置在 <code class="rounded bg-muted px-1">config/resume-demo.ts</code> 的
            <code class="rounded bg-muted px-1">RESUME_COMPARE_FIELDS</code>，可按需增删分组 / 行 / best 规则。
          </p>
        </div>
        <UButton icon="i-lucide-git-compare-arrows" label="打开对比" @click="open = true" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div v-for="r in resumes" :key="r.id" class="rounded-lg border border-default p-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-highlighted">{{ r.name }}</p>
            <span class="text-xs text-muted">{{ r.updatedAt }}</span>
          </div>
          <p class="mt-1 text-xs text-muted">
            {{ r.targetRole }} · {{ r.yearsOfExperience }} 年 · {{ r.expectedSalary }}k
          </p>
        </div>
      </div>
    </div>
  </div>

  <ResumeCompareModal v-model:open="open" :options="resumes" :fields="RESUME_COMPARE_FIELDS" />
</template>
