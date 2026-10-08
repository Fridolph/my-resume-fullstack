<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Sortable bar',
})

const toast = useToast()

// mock 多项「设计」数据（模拟项目 design 选项条）
const designs = ref<Record<string, any>[]>([
  {
    id: 1,
    name: 'Northwind — Rooftop 8.8kW',
    status: 20,
    quickQuote: false,
    badgeActive: true,
    tooltip: 'Standard design',
  },
  {
    id: 2,
    name: 'Battery Only — Site B',
    status: 40,
    wide: true,
    quickQuote: true,
    badgeActive: false,
    tooltip: 'Quick quote (no design)',
    badge: { label: 'Signed', class: 'bg-[#e0f5e6] text-[#3ec064]' },
  },
  {
    id: 3,
    name: 'Retrofit — Warehouse 12kW',
    status: 30,
    quickQuote: false,
    badgeActive: true,
    tooltip: 'Standard design',
  },
  {
    id: 4,
    name: 'Café Roof — East Wing',
    status: 20,
    quickQuote: false,
    badgeActive: true,
    tooltip: 'Standard design',
  },
  {
    id: 5,
    name: 'Quick Quote — 6.6kW',
    status: 20,
    quickQuote: true,
    badgeActive: false,
    tooltip: 'Quick quote (no design)',
  },
  {
    id: 6,
    name: 'Harbour View — Block C',
    status: 40,
    wide: true,
    quickQuote: false,
    badgeActive: true,
    tooltip: 'Standard design',
    badge: { label: 'Signed', class: 'bg-[#e0f5e6] text-[#3ec064]' },
  },
  {
    id: 7,
    name: 'Solar Farm — Phase 1',
    status: 50,
    quickQuote: false,
    badgeActive: true,
    tooltip: 'Standard design',
  },
  {
    id: 8,
    name: 'Depot — Battery Retrofit',
    status: 60,
    quickQuote: false,
    badgeActive: false,
    tooltip: 'Standard design',
  },
])

const activeId = ref<number | null>(1)

// 主题：Dark（默认）/ Light / System（随系统）
const themeMode = ref<'dark' | 'light' | 'system'>('dark')
const colorMode = useColorMode()
const barTheme = computed<'dark' | 'light'>(() =>
  themeMode.value === 'system' ? (colorMode.value === 'dark' ? 'dark' : 'light') : themeMode.value,
)

const themeOptions = [
  { label: 'Dark', value: 'dark', icon: 'i-lucide-moon' },
  { label: 'Light', value: 'light', icon: 'i-lucide-sun' },
  { label: 'System', value: 'system', icon: 'i-lucide-monitor' },
]

let seed = designs.value.length
function addDesign() {
  seed += 1
  const id = seed
  designs.value = [
    ...designs.value,
    {
      id,
      name: `New design #${id}`,
      status: 20,
      quickQuote: false,
      badgeActive: true,
      tooltip: 'Standard design',
    },
  ]
  activeId.value = id
  toast.add({ title: `Added design #${id}`, color: 'success' })
}

function onItemClick(item: Record<string, any>) {
  const index = designs.value.findIndex(d => d.id === item.id)
  toast.add({
    title: `Selected: ${item.name}`,
    description: `position #${index + 1}`,
    color: 'neutral',
  })
}

function moreItems(item: Record<string, any>) {
  const notify = (action: string) => toast.add({ title: `${action}: ${item.name}`, color: 'neutral' })
  return [
    [
      { label: 'Rename', icon: 'i-lucide-pencil', onSelect: () => notify('Rename') },
      { label: 'Duplicate', icon: 'i-lucide-copy', onSelect: () => notify('Duplicate') },
    ],
    [
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => notify('Delete'),
      },
    ],
  ]
}

const order = computed(() => designs.value.map((_d, i) => `#${i + 1}`).join('  →  '))
</script>

<template>
  <div class="content-pad mx-auto max-w-5xl">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Sortable bar</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      横向可拖拽排序的选项条
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">SortableBar</code> （子组件
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">SortableBarItem</code> /
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">SortableBarBadge</code>）。 支持横向滚动 + 溢出滚动按钮 +
      ResizeObserver 自适应，拖拽排序、点击选中、<code class="rounded bg-elevated px-1.5 py-0.5 text-xs">#extra</code> /
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">#actions</code> 插槽。
    </p>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <span class="text-sm text-muted">主题</span>
      <div class="inline-flex items-center gap-1">
        <UButton
          v-for="opt in themeOptions"
          :key="opt.value"
          :label="opt.label"
          :icon="opt.icon"
          size="sm"
          :color="themeMode === opt.value ? 'primary' : 'neutral'"
          :variant="themeMode === opt.value ? 'solid' : 'outline'"
          @click="themeMode = opt.value as any"
        />
      </div>
      <span class="text-xs text-dimmed">默认 dark；System 跟随浏览器/系统主题</span>
    </div>

    <div class="mt-4 overflow-hidden rounded-xl">
      <SortableBar v-model="designs" v-model:active-id="activeId" :theme="barTheme" @item-click="onItemClick">
        <template #actions="{ item }">
          <UDropdownMenu :items="moreItems(item)" :content="{ side: 'bottom', align: 'end' }">
            <UButton
              icon="i-lucide-ellipsis-vertical"
              variant="link"
              color="neutral"
              size="xs"
              :ui="{ base: 'p-0', leadingIcon: 'size-5 text-[var(--sb-fg-muted)]' }"
              @click.stop
            />
          </UDropdownMenu>
        </template>

        <template #extra="{ count }">
          <span class="whitespace-nowrap text-xs text-[var(--sb-fg-muted)]">{{ count }} designs</span>
          <UButton icon="i-lucide-plus" size="xs" variant="soft" label="New" @click="addDesign" />
        </template>
      </SortableBar>
    </div>

    <div class="mt-4 space-y-1 text-xs text-muted">
      <p>当前顺序：{{ order }}</p>
      <p>
        选中：{{ activeId ? `#${activeId}` : '无' }} ——
        {{ designs.find(d => d.id === activeId)?.name || '-' }}
      </p>
    </div>

    <div class="mt-6 rounded-lg border border-default bg-muted/30 p-4 text-xs leading-6 text-muted">
      <p class="font-medium text-highlighted">与 greensketch 的差异</p>
      <ul class="mt-1 list-disc space-y-0.5 ps-5">
        <li>
          去掉了 <code>useProjectDetail</code> / <code>useDesignsListQuery</code> /
          <code>useDesignSortMutation</code> 等业务依赖，改为 <code>v-model</code> 驱动本地数组。
        </li>
        <li>排序即时生效（不再 persist 到后端）——接入时可在 <code>@item-click</code> / 排序后回调里自行提交。</li>
        <li>
          颜色由 <code>--sb-*</code> CSS 变量按 <code>theme</code> 切换，可外部接 <code>useColorMode</code> 随系统。
        </li>
      </ul>
    </div>
  </div>
</template>
