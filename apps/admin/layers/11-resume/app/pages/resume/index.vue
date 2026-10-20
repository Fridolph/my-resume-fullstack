<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useQueryCache } from '@pinia/colada'
import { normalizeApiError, resolveApiErrorMessage, type ResumeSummary } from '@rs/common'
import { queryKeys } from '~/lib/query-keys'
import { createResumeApi } from '../../apis/resume'
import MyDataTable from '#layers/ui/app/components/MyDataTable.vue'

/**
 * 简历概览（`/resume`）。
 *
 * 这一页回答"我有哪些简历"，并提供两件管理动作：**进编辑页**、**删除**。
 * 两种呈现（卡片 / 列表）只是同一份数据的两种排布，操作项完全一致。
 *
 * 布局用后台通用的 `has-sidebar`，**不叠 settings 那样的二级侧栏**（只有一项入口，加了反而多一层点击）。
 *
 * ⚠️ 「查看详情」图标不在这里：详情预览要用公开站的展示层，而那套组件属 web 的 layer
 * （按分层约定 admin 不能直接引用）。它要先上提到 `packages/ui` 才能接，见 DAO-030 的下一轮计划 ——
 * 在那之前不放一个点了没去处的按钮。
 */
definePageMeta({
  layout: 'has-sidebar',
  title: '简历',
  middleware: 'auth',
})

const toast = useToast()
const api = createResumeApi()
const queryCache = useQueryCache()
const { signOut } = useAuthState()
const {
  summaries,
  total,
  page,
  pageSize,
  status,
  error,
  refresh,
  q,
  published,
  sort,
  order,
  hasQuery,
  clearQuery,
  applySearchNow,
} = useResumeList()

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
  { value: 'list' as const, icon: 'i-lucide-table', label: '列表' },
]

// `meta.sortable` 是**给 `MyDataTable` 的唯一信号**：组件不认识业务字段，
// 只按这个开关决定哪些表头可点（见 packages/ui 的 MyDataTable 说明）。
// ⚠️ `meta.sortable` 是给 `MyDataTable` 的信号，但 TanStack 的 `ColumnMeta` 是**空接口**，
// 直接写字面量会触发 excess property 检查。这里用一次断言把"扩展列元数据"显式化，
// 而不是把整列类型降级 —— `#name-cell` 等插槽仍按 `ResumeSummary` 推导。
const columns = [
  { accessorKey: 'name', header: '简历名', meta: { sortable: true } },
  { accessorKey: 'locale', header: '语言' },
  { accessorKey: 'revision', header: '版本' },
  { accessorKey: 'updatedAt', header: '最近改动', meta: { sortable: true } },
  { id: 'actions', header: '操作' },
] as unknown as TableColumn<ResumeSummary>[]

/**
 * 排序回调。
 *
 * `MyDataTable` 在 `packages/ui`，它不可能知道本页的排序白名单，所以回传的是 `string`。
 * 收敛放在页面（知道白名单的一侧），组件保持通用。
 */
function onSortChange(key: string): void {
  if (key === 'updatedAt' || key === 'createdAt' || key === 'name') {
    sort.value = key
  }
}

/** 发布态筛选与排序的可选值（组件持有 UI，状态在 composable 里） */
const PUBLISHED_OPTIONS: Array<{ label: string; value: 'all' | 'published' | 'draft' }> = [
  { label: '全部状态', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '未发布', value: 'draft' },
]
const SORT_OPTIONS: Array<{ label: string; value: 'updatedAt' | 'createdAt' | 'name' }> = [
  { label: '最近更新', value: 'updatedAt' },
  { label: '最近创建', value: 'createdAt' },
  { label: '按名称', value: 'name' },
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

// ── 删除（物理删除，无恢复入口）──────────────────────────────────────
const deleteOpen = ref(false)
const deleteTarget = ref<ResumeSummary | null>(null)

/**
 * 设为默认展示。
 *
 * 接口返回**更新后的完整列表**（互斥结果由服务端在一事务里算好），所以这里整体替换，
 * 不用本地猜"另一份现在是 true 还是 false" —— 少一处可能与服务端不一致的判断。
 */
async function setDefault(id: number) {
  try {
    await api.setDefault(id)
    await refresh()
  } catch (problem) {
    toast.add({ title: '设置失败', description: resolveApiErrorMessage(normalizeApiError(problem)), color: 'error' })
  }
}

/** 卡片整卡可点 → 进只读详情（键盘用户走标题链接，这里只是鼠标增强） */
async function openDetail(id: number) {
  await navigateTo(`/resume/${id}`)
}

function askDelete(item: ResumeSummary) {
  deleteTarget.value = item
  deleteOpen.value = true
}

/**
 * 二次确认之后才真的删除。
 *
 * 后端是**物理删除**（简历不留软删痕迹，见 DAO-033）：所以文案必须如实说"无法恢复"，
 * 不能含糊成"从列表移除" —— 那会让用户以为还能找回来。
 * 删完让列表缓存失效，避免返回时还看到已删的那份。
 */
async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) {
    return
  }

  try {
    await api.remove(target.id)
    await queryCache.invalidateQueries({ key: queryKeys.resume.list() })
    toast.add({
      title: '已删除',
      description: `「${target.name}」及其内容已删除。`,
      color: 'success',
      icon: 'i-lucide-trash-2',
    })
  } catch (problem) {
    const normalized = normalizeApiError(problem)
    if (normalized.code === 401) {
      signOut()
      await navigateTo('/login')
      return
    }
    toast.add({
      title: '删除失败',
      description: resolveApiErrorMessage(normalized),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    deleteTarget.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <!-- 页面标题由布局的页头按 `route.meta.title` 渲染，这里不再重复写一遍，直接给说明与操作 -->
      <p class="max-w-2xl text-sm leading-6 text-muted">
        这里是你名下的简历：点标题看只读预览，进编辑页改内容。新建后也可在公开站的草稿工作台继续补充。
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
    <!--
        搜索 / 筛选 / 排序：**与视图无关**，所以放在 card/table 分支**之上**。
        （曾经放在 `MyDataTable` 的 `#toolbar` 插槽里 → 切到卡片后搜索就消失了。）
      -->
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        placeholder="搜索简历名称（回车立即搜索）"
        class="w-full sm:w-56"
        @keydown.enter.prevent="applySearchNow"
      />
      <USelect v-model="published" :items="PUBLISHED_OPTIONS" value-key="value" label-key="label" class="w-32" />
      <USelect v-model="sort" :items="SORT_OPTIONS" value-key="value" label-key="label" class="w-36" />
      <UButton
        v-if="hasQuery"
        color="neutral"
        variant="ghost"
        icon="i-lucide-list-x"
        label="清除条件"
        @click="clearQuery"
      />
    </div>

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
      <UCard
        v-for="item in summaries"
        :key="item.id"
        class="cursor-pointer transition-colors hover:border-primary/40"
        :ui="{ body: 'p-5 sm:p-5' }"
        @click="openDetail(item.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-file-text" class="size-5" />
          </span>
          <UBadge color="neutral" variant="subtle" :label="`rev ${item.revision}`" />
        </div>

        <div class="mt-4 flex items-center gap-1.5">
          <UIcon
            v-if="item.isDefault"
            name="i-lucide-star"
            class="size-4 shrink-0 text-primary"
            aria-label="默认展示"
          />
          <NuxtLink :to="`/resume/${item.id}`" class="truncate font-medium text-highlighted hover:text-primary">
            {{ item.name }}
          </NuxtLink>
        </div>
        <p class="mt-1 text-xs text-muted">{{ item.locale }} · 更新于 {{ formatUpdatedAt(item.updatedAt) }}</p>

        <div class="mt-4 flex items-center gap-1 border-t border-default pt-3">
          <UButton
            icon="i-lucide-star"
            size="xs"
            color="neutral"
            :variant="item.isDefault ? 'soft' : 'ghost'"
            :disabled="item.isDefault"
            :label="item.isDefault ? '默认展示' : '设为默认'"
            @click.stop="setDefault(item.id)"
          />
          <UButton
            :to="`/resume/${item.id}`"
            icon="i-lucide-eye"
            size="xs"
            color="neutral"
            variant="ghost"
            label="查看"
            @click.stop
          />
          <UButton
            :to="`/resume/${item.id}/edit`"
            icon="i-lucide-pencil"
            size="xs"
            color="neutral"
            variant="ghost"
            label="编辑"
            @click.stop
          />
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="error"
            variant="ghost"
            label="删除"
            @click.stop="askDelete(item)"
          />
        </div>
      </UCard>
    </div>

    <!-- 列表视图（UTable：字段与交互都会继续长，表格比手写行更好扩展） -->
    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <!--
        列表视图走公共组件 `MyDataTable`（`packages/ui`）：表格 + 服务端分页 + "共 N 条"。
        它与审计页是同一份实现 —— 之前这两处各写一套，外观与分页行为已经开始分叉。
      -->
      <MyDataTable
        :data="summaries"
        :columns="columns"
        :total="total"
        :page="page"
        :page-size="pageSize"
        show-page-size
        :sort="sort"
        :order="order"
        empty-text="还没有简历"
        unit="份简历"
        @update:page="page = $event"
        @update:page-size="pageSize = $event"
        @update:sort="onSortChange"
        @update:order="order = $event"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-muted" />
            <NuxtLink
              :to="`/resume/${row.original.id}`"
              class="truncate font-medium text-highlighted hover:text-primary"
            >
              {{ row.original.name }}
            </NuxtLink>
          </div>
        </template>

        <template #locale-cell="{ row }">
          <UBadge color="neutral" variant="subtle" :label="row.original.locale" />
        </template>

        <template #revision-cell="{ row }">
          <span class="text-muted">rev {{ row.original.revision }}</span>
        </template>

        <template #updatedAt-cell="{ row }">
          <span class="text-muted">{{ formatUpdatedAt(row.original.updatedAt) }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-1">
            <!--
              纯图标按钮**必须**有 tooltip（Owner 2026-10-19）：没有文案时用户只能靠猜。
              用 `UTooltip` 而不是原生 `title` —— `title` 延迟 1s、样式不可控、触屏没有。
              默认星：**空心 = 未生效、实心 = 已生效**（Lucide 无 filled 变体，用 `fill-current` 填）。
            -->
            <UTooltip text="设为默认展示（公开首页展示这一份）">
              <UButton
                icon="i-lucide-star"
                size="xs"
                color="neutral"
                :variant="row.original.isDefault ? 'soft' : 'outline'"
                :class="row.original.isDefault ? 'fill-current' : ''"
                :disabled="row.original.isDefault"
                :aria-label="row.original.isDefault ? '已是默认展示' : `把「${row.original.name}」设为默认展示`"
                @click="setDefault(row.original.id)"
              />
            </UTooltip>
            <UTooltip text="查看（只读预览）">
              <UButton
                :to="`/resume/${row.original.id}`"
                icon="i-lucide-eye"
                size="xs"
                color="neutral"
                variant="ghost"
                :aria-label="`查看「${row.original.name}」`"
              />
            </UTooltip>
            <UTooltip text="编辑">
              <UButton
                :to="`/resume/${row.original.id}/edit`"
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                :aria-label="`编辑「${row.original.name}」`"
              />
            </UTooltip>
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              :aria-label="`删除「${row.original.name}」`"
              @click="askDelete(row.original)"
            />
          </div>
        </template>
      </MyDataTable>
    </UCard>

    <!--
      卡片视图的页脚：表格视图由 `MyDataTable` 自带一个，卡片视图原先**完全没有** ——
      切到卡片后既看不到总数、也翻不了页。
      位置在整条 `v-if / v-else` 链之后（不能插在链中间：`v-else` 必须紧邻 `v-if`）。
    -->
    <div
      v-if="viewMode === 'card'"
      class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-default pt-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm text-muted">共 {{ total }} 份简历</p>
        <USelect v-model="pageSize" :items="RESUME_PAGE_SIZE_OPTIONS" size="sm" class="w-20" aria-label="每页条数" />
        <span class="text-sm text-muted">条/页</span>
      </div>
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>

    <ModalDeleteConfirm
      v-model:open="deleteOpen"
      title="删除这份简历？"
      :content="`「${deleteTarget?.name ?? ''}」及其全部内容会被永久删除，无法恢复。`"
      confirm-text="删除"
      cancel-text="取消"
      :cooldown="3"
      :confirm="confirmDelete"
    />
  </div>
</template>
