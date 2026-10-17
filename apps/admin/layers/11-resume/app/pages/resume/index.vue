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
const { summaries, total, page, pageSize, status, error, refresh } = useResumeList()

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

const columns: TableColumn<ResumeSummary>[] = [
  { accessorKey: 'name', header: '简历名' },
  { accessorKey: 'locale', header: '语言' },
  { accessorKey: 'revision', header: '版本' },
  { accessorKey: 'updatedAt', header: '最近改动' },
  { id: 'actions', header: '操作' },
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
        empty-text="还没有简历"
        unit="份简历"
        @update:page="page = $event"
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
            <UButton
              icon="i-lucide-star"
              size="xs"
              color="neutral"
              :variant="row.original.isDefault ? 'soft' : 'ghost'"
              :disabled="row.original.isDefault"
              :aria-label="row.original.isDefault ? '已是默认展示' : `把「${row.original.name}」设为默认展示`"
              :title="row.original.isDefault ? '已是默认展示' : '设为默认展示'"
              @click="setDefault(row.original.id)"
            />
            <UButton
              :to="`/resume/${row.original.id}`"
              icon="i-lucide-eye"
              size="xs"
              color="neutral"
              variant="ghost"
              :aria-label="`查看「${row.original.name}」`"
            />
            <UButton
              :to="`/resume/${row.original.id}/edit`"
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              :aria-label="`编辑「${row.original.name}」`"
            />
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
