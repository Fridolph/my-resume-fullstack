<script setup lang="ts">
import { normalizeApiError, type ShareLinkDetail, type ShareLinkListItem, type ShareLinkStatus } from '@rs/common'
import MyDataTable from '#layers/ui/app/components/MyDataTable.vue'
import { SHARE_STATUS_META, createShareAdminApi } from '#layers/resume/app/apis/share'

/**
 * 发布管理（分享链接）。
 *
 * ## 为什么需要这一页
 *
 * "链接失效"是**物化撤销**的：取消发布会把该简历的所有链接永久撤销，重新发布也不复活
 * （DAO-050 的决定）。那么作者必须有一个地方能看见"我现在有哪些链接、哪条还活着"——
 * 否则他无从判断该不该重新分享。这条产品需求是被那条撤销语义**逼出来的**，不是可有可无。
 *
 * ## 为什么不在这里建链
 *
 * 建链要选有效期 / 权限位，属于"发布动作"，入口在用户端（`/my-resumes`）。
 * 后台只做**管理**：看状态、看用量、撤销、改备注。职责分开后，两个界面都简单。
 */
definePageMeta({ title: '发布管理', middleware: ['auth'] })

const api = createShareAdminApi()
const toast = useToast()
const { public: publicConfig } = useRuntimeConfig()

const status = ref<ShareLinkStatus | 'all'>('all')
const page = ref(1)
const pageSize = ref(20)

const {
  data,
  refresh,
  status: fetchStatus,
} = await useAsyncData(
  () => `admin-shares:${status.value}:${page.value}:${pageSize.value}`,
  () =>
    api.list({
      page: page.value,
      pageSize: pageSize.value,
      ...(status.value === 'all' ? {} : { status: status.value }),
    }),
  { watch: [status, page, pageSize] },
)

const items = computed<ShareLinkListItem[]>(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const loading = computed(() => fetchStatus.value === 'pending')

/** 分享地址由 admin 拼（服务端不知道前端 origin） */
function shareUrlOf(item: ShareLinkListItem): string {
  return `${publicConfig.webOrigin}/share/${item.token}`
}

const copiedId = ref<string | null>(null)

async function copyLink(item: ShareLinkListItem): Promise<void> {
  if (!import.meta.client || !navigator.clipboard) {
    return
  }
  await navigator.clipboard.writeText(shareUrlOf(item))
  copiedId.value = item.id
  setTimeout(() => (copiedId.value = null), 2000)
}

// ── 详情 ────────────────────────────────────────────────────────────
const detailOpen = ref(false)
const detail = ref<ShareLinkDetail | null>(null)
const detailBusy = ref(false)

async function openDetail(item: ShareLinkListItem): Promise<void> {
  detailBusy.value = true
  detailOpen.value = true
  try {
    detail.value = await api.detail(item.id)
  } catch (problem) {
    toast.add({ title: '读取详情失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    detailBusy.value = false
  }
}

// ── 撤销 ────────────────────────────────────────────────────────────
const revokingId = ref<string | null>(null)

async function revoke(item: ShareLinkListItem): Promise<void> {
  revokingId.value = item.id
  try {
    await api.revoke(item.id)
    toast.add({ title: '已撤销', description: '该链接立即失效，重新分享需要新建链接', color: 'success' })
    await refresh()
    if (detail.value?.id === item.id) {
      detailOpen.value = false
    }
  } catch (problem) {
    toast.add({ title: '撤销失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    revokingId.value = null
  }
}

// ── 改备注 ──────────────────────────────────────────────────────────
const editOpen = ref(false)
const editTarget = ref<ShareLinkListItem | null>(null)
const editLabel = ref('')
const editBusy = ref(false)

function openEdit(item: ShareLinkListItem): void {
  editTarget.value = item
  editLabel.value = item.label ?? ''
  editOpen.value = true
}

async function saveEdit(): Promise<void> {
  const target = editTarget.value
  if (!target) {
    return
  }
  editBusy.value = true
  try {
    await api.update(target.id, { label: editLabel.value.trim() === '' ? null : editLabel.value.trim() })
    toast.add({ title: '备注已更新', color: 'success' })
    editOpen.value = false
    await refresh()
  } catch (problem) {
    toast.add({ title: '保存失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    editBusy.value = false
  }
}

const STATUS_OPTIONS: Array<{ label: string; value: ShareLinkStatus | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '有效', value: 'active' },
  { label: '已过期', value: 'expired' },
  { label: '已撤销', value: 'revoked' },
]

/** "还剩几天 / 过期多久"—— 比裸时间戳直观 */
function expiryText(item: ShareLinkListItem): string {
  if (item.status === 'revoked') {
    return item.revokedReason === 'unpublished' ? '因简历取消发布' : '作者主动撤销'
  }
  if (item.status === 'expired') {
    return '已过期'
  }
  return item.expiresInDays === null ? '—' : `${item.expiresInDays} 天后`
}

const columns = [
  { accessorKey: 'label', header: '备注' },
  { accessorKey: 'resumeName', header: '简历' },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'expiresAt', header: '有效期' },
  { accessorKey: 'lastAccessAt', header: '最近访问' },
  { id: 'actions', header: '操作' },
] as unknown as Array<{ accessorKey?: string; id?: string; header: string }>
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-highlighted">发布管理</h1>
        <p class="mt-1 text-sm text-muted">分享链接按**物化撤销**管理：撤销后永久失效，重新分享需要新建链接。</p>
      </div>
      <div class="flex items-center gap-2">
        <USelect v-model="status" :items="STATUS_OPTIONS" value-key="value" label-key="label" class="w-32" />
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="subtle" :loading="loading" @click="refresh()" />
      </div>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <MyDataTable
        :data="items"
        :columns="columns"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :loading="loading"
        unit="条链接"
        empty-text="还没有分享链接。到「简历」列表里对已发布的简历点分享。"
        @update:page="page = $event"
        @update:page-size="pageSize = $event"
      >
        <template #label-cell="{ row }">
          <span v-if="row.original.label" class="font-medium text-highlighted">{{ row.original.label }}</span>
          <span v-else class="text-dimmed">未备注</span>
        </template>

        <template #resumeName-cell="{ row }">
          <span>{{ row.original.resumeName }}</span>
          <UBadge v-if="!row.original.resumePublished" size="xs" color="warning" variant="subtle" label="未发布" />
        </template>

        <template #status-cell="{ row }">
          <UBadge
            size="xs"
            :color="SHARE_STATUS_META[row.original.status].color"
            variant="subtle"
            :label="SHARE_STATUS_META[row.original.status].label"
          />
          <span v-if="row.original.aiQuota !== null" class="ml-1 text-xs text-muted">
            AI {{ row.original.aiUsed }}/{{ row.original.aiQuota }}
          </span>
        </template>

        <template #expiresAt-cell="{ row }">
          <span class="text-sm">{{ expiryText(row.original) }}</span>
        </template>

        <template #lastAccessAt-cell="{ row }">
          <span class="text-sm text-muted">
            {{ row.original.lastAccessAt ? new Date(row.original.lastAccessAt).toLocaleString('zh-CN') : '从未访问' }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip text="复制链接">
              <UButton
                :icon="copiedId === row.original.id ? 'i-lucide-check' : 'i-lucide-copy'"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="copyLink(row.original)"
              />
            </UTooltip>
            <UTooltip text="查看用量">
              <UButton
                icon="i-lucide-chart-no-axes-column"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="openDetail(row.original)"
              />
            </UTooltip>
            <UTooltip text="改备注">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="openEdit(row.original)"
              />
            </UTooltip>
            <UTooltip text="撤销">
              <UButton
                icon="i-lucide-ban"
                size="xs"
                color="error"
                variant="ghost"
                :disabled="row.original.status === 'revoked'"
                :loading="revokingId === row.original.id"
                @click="revoke(row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </MyDataTable>
    </UCard>

    <!-- 详情：用量统计 -->
    <USlideover v-model:open="detailOpen" title="链接用量">
      <template #body>
        <div v-if="detailBusy" class="text-sm text-muted">读取中…</div>
        <div v-else-if="detail" class="flex flex-col gap-4">
          <div>
            <p class="text-sm font-medium text-highlighted">{{ detail.label || '未备注' }}</p>
            <p class="mt-1 break-all text-xs text-muted">{{ shareUrlOf(detail) }}</p>
          </div>

          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-muted">简历</dt>
              <dd>{{ detail.resumeName }}</dd>
            </div>
            <div>
              <dt class="text-muted">状态</dt>
              <dd>{{ SHARE_STATUS_META[detail.status].label }}</dd>
            </div>
            <div>
              <dt class="text-muted">事件总数</dt>
              <dd>{{ detail.totalEvents }}</dd>
            </div>
            <div>
              <dt class="text-muted">最近访问</dt>
              <dd>{{ detail.lastAccessAt ? new Date(detail.lastAccessAt).toLocaleString('zh-CN') : '从未访问' }}</dd>
            </div>
          </dl>

          <div v-if="detail.stats.length" class="flex flex-col gap-1">
            <p class="text-sm font-medium">按事件</p>
            <div v-for="stat in detail.stats" :key="stat.name" class="flex justify-between text-sm">
              <span class="text-muted">{{ stat.name }}</span>
              <span>{{ stat.count }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-muted">还没有任何访问记录。</p>
        </div>
      </template>
    </USlideover>

    <!-- 改备注 -->
    <UModal v-model:open="editOpen" title="修改备注">
      <template #body>
        <UFormField label="备注（这次分享给谁 / 做什么）">
          <UInput v-model="editLabel" maxlength="64" placeholder="例如：投给 A 公司" />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="editOpen = false" />
          <UButton :loading="editBusy" label="保存" @click="saveEdit" />
        </div>
      </template>
    </UModal>
  </div>
</template>
