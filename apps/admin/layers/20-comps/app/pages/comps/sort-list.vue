<script setup lang="ts">
import type { ColumnDraftItem } from '~/types/column-sort'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Sort list',
})

// mock 数据：模拟「项目列表」的可配置列
const items = ref<ColumnDraftItem[]>([
  { key: 'client', label: 'Client name', visible: true },
  { key: 'address', label: 'Site address', visible: true },
  { key: 'type', label: 'Project type', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'rebate', label: 'Rebate status', visible: false },
  { key: 'owner', label: 'Owner', visible: true },
  { key: 'createdAt', label: 'Created at', visible: false },
  { key: 'updatedAt', label: 'Updated at', visible: false },
])

const order = computed(() => items.value.map(item => item.key).join('  →  '))
const hiddenKeys = computed(() => items.value.filter(item => !item.visible).map(item => item.key))

function reset() {
  items.value = [
    { key: 'client', label: 'Client name', visible: true },
    { key: 'address', label: 'Site address', visible: true },
    { key: 'type', label: 'Project type', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'rebate', label: 'Rebate status', visible: false },
    { key: 'owner', label: 'Owner', visible: true },
    { key: 'createdAt', label: 'Created at', visible: false },
    { key: 'updatedAt', label: 'Updated at', visible: false },
  ]
}
</script>

<template>
  <div class="content-pad mx-auto max-w-2xl">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Column sort list</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      拖拽排序 + 显隐勾选的列表
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">ColumnSortList</code>。
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">v-model</code> 绑定
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">ColumnDraftItem[]</code>，拖拽后数组顺序实时同步。
    </p>

    <UCard class="mt-6">
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="font-semibold">Column order & visibility</p>
            <p class="text-sm text-muted">拖动左侧把手调整顺序，勾选控制是否显示</p>
          </div>
          <UButton
            label="Reset"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-rotate-ccw"
            @click="reset"
          />
        </div>
      </template>

      <ColumnSortList v-model="items" />
    </UCard>

    <div class="mt-4 space-y-1 text-xs text-muted">
      <p>当前顺序：{{ order }}</p>
      <p>隐藏列：{{ hiddenKeys.length ? hiddenKeys.join(', ') : '无' }}</p>
    </div>
  </div>
</template>
