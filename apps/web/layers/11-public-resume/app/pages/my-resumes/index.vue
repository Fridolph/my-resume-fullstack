<script setup lang="ts">
import { normalizeApiError } from '@rs/common'
import { createResumeDraftApi } from '#layers/public-resume/app/apis/resume-draft'
import { createDemoResumeDocument } from '#layers/public-resume/app/utils/resume-document'
import { capabilitySample } from '#layers/public-resume/app/config/capability-sample'
import ResumeAdminLoginModal from '#layers/public-resume/app/components/resume/ResumeAdminLoginModal.vue'

/**
 * 我的简历（工作台入口）。
 *
 * 这个位置（`/my-resumes`）原在 `/resume`，与工作台是同一套作者视角；
 * 而且已经漂移（排布改按 section id 后，手写 mock 没有区块清单 → 渲染不出内容）。
 * 现在：数据来自 `GET /resume`，点一份进 `/my-resumes/draft/:id`。
 * `/resume/:id` 让给了**公开只读**展示（DAO-038）。
 *
 * 「展示哪一份」的答案就落在这里 —— **由用户自己选**；不再依赖 localStorage 记"上次那份"
 * （那只是没指定 id 时的兼容回退）。公开站（访客看的页面）走哪条 URL 是另一件事，
 * 见 `dao/tasks/DAO-038`。
 */
definePageMeta({ title: '我的简历' })

const api = createResumeDraftApi()
const { isAuthed } = useAuthState()
const toast = useToast()

const loginOpen = ref(false)
const busyId = ref<number | null>(null)
const creating = ref(false)

/** 每页条数：卡片网格一屏放得下的数量 */
const PAGE_SIZE = 12
const page = ref(1)

/**
 * 列表现在是**服务端分页**的：`data` 是 `{ items, total, page, pageSize }`。
 * 页码进请求参数，所以 `page` 也必须进 `watch` —— 否则翻页不会重新取数。
 */
const {
  data: listPage,
  refresh,
  status,
} = await useAsyncData(
  'my-resumes',
  () => (isAuthed.value ? api.list({ page: page.value, pageSize: PAGE_SIZE }) : Promise.resolve(null)),
  { watch: [isAuthed, page] },
)

const resumes = computed(() => listPage.value?.items ?? [])
const total = computed(() => listPage.value?.total ?? 0)

const isLoading = computed(() => status.value === 'pending')

// ── ★ 设为默认 / 重命名 ────────────────────────────────────────────
// 空态文案让用户"去列表点 ★"，但列表此前既没有 ★ 也没有重命名入口 —— 承诺写在了文案里，按钮没做。
const defaultBusyId = ref<number | null>(null)

/**
 * 设为默认展示。
 *
 * 公开页 `/` 展示的就是"默认"那一份，所以这个动作改变的是**访客看到的首页** ——
 * 对作者来说是"发布哪一份"，值得即时反馈（失败一定要提示，不能静默吞掉）。
 */
async function setDefault(id: number) {
  if (defaultBusyId.value) return
  defaultBusyId.value = id
  try {
    await api.setDefault(id)
    await refresh()
    toast.add({ title: '已设为默认展示', description: '公开首页现在展示这一份。', color: 'success' })
  } catch (problem) {
    toast.add({ title: '设置失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    defaultBusyId.value = null
  }
}

// ── 发布 / 取消发布 ────────────────────────────────────────────────
// B1 之后公开读只认「已发布」：未发布的简历 `/resume/:id` 直接 404。
// 所以列表必须把发布态显示出来 —— 否则作者只会看到「简历突然打不开了」，
// 而不知道是自己没发布（迁移后非默认简历一律未发布）。
const publishBusyId = ref<number | null>(null)

interface PublishableItem {
  id: number
  name: string
  publishedAt: string | null
  isDefault: boolean
}

function publishTitle(item: PublishableItem): string {
  return item.publishedAt ? '已发布：公开链接可以访问（点击取消发布）' : '未发布：公开链接打不开（点击发布）'
}

/**
 * ★ 的可用性**依赖发布态**：未发布的简历不能被设为默认。
 *
 * 服务端对此返回 400 `Resume.Publish:required`（不变量：默认 ⇒ 已发布，
 * 否则首页会指向一份读不到的内容）。这里提前禁用并给出原因，
 * 比让作者点一下再吃一个错误提示更好。
 */
function starTitle(item: PublishableItem): string {
  if (item.isDefault) return '公开首页正在展示这一份'
  if (!item.publishedAt) return '请先发布，再设为默认展示'
  return '设为默认展示（公开首页展示它）'
}

async function togglePublished(item: PublishableItem) {
  if (publishBusyId.value) return
  const next = !item.publishedAt
  publishBusyId.value = item.id
  try {
    await api.setPublished(item.id, next)
    await refresh()
    toast.add({
      title: next ? '已发布' : '已取消发布',
      description: next
        ? `「${item.name}」的公开链接现在可以访问了。`
        : item.isDefault
          ? '公开链接现在打不开；它原本是默认展示，默认已一并取消。'
          : '公开链接现在打不开。',
      color: next ? 'success' : 'warning',
    })
  } catch (problem) {
    toast.add({ title: '操作失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    publishBusyId.value = null
  }
}

const renameOpen = ref(false)
const renameTarget = ref<{ id: number; name: string } | null>(null)
const renameDraft = ref('')
const renaming = ref(false)

/** 打开重命名弹窗；名字长度后端有 1..80 约束，这里同步拦截，避免一次必然 400 的请求 */
function askRename(item: { id: number; name: string }) {
  renameTarget.value = { id: item.id, name: item.name }
  renameDraft.value = item.name
  renameOpen.value = true
}

const canSubmitRename = computed(() => {
  const next = renameDraft.value.trim()
  return next.length > 0 && next.length <= 80 && next !== renameTarget.value?.name
})

async function submitRename() {
  const target = renameTarget.value
  if (!target || !canSubmitRename.value || renaming.value) return
  renaming.value = true
  try {
    await api.rename(target.id, renameDraft.value.trim())
    renameOpen.value = false
    await refresh()
  } catch (problem) {
    toast.add({ title: '重命名失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    renaming.value = false
  }
}

/** 新建：给一份能立刻编辑的演示文档，然后直接进工作台 */
async function createResume() {
  if (creating.value) return
  creating.value = true
  try {
    const created = await api.create({
      name: '我的求职简历',
      locale: 'zh',
      document: createDemoResumeDocument(capabilitySample),
    })
    await navigateTo(`/my-resumes/draft/${created.resume.id}`)
  } catch (problem) {
    toast.add({ title: '创建失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    creating.value = false
  }
}

async function removeResume(id: number, name: string) {
  if (!window.confirm(`删除「${name}」？简历本体与草稿都会一并删除，且不可恢复。`)) return
  busyId.value = id
  try {
    await api.remove(String(id))
    await refresh()
  } catch (problem) {
    toast.add({ title: '删除失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    busyId.value = null
  }
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">我的简历</h1>
        <p class="mt-1 text-sm text-muted">选一份继续编辑，或新建一份。</p>
      </div>
      <UButton v-if="isAuthed" icon="i-lucide-plus" :loading="creating" label="新建简历" @click="createResume" />
    </div>

    <!-- 未登录：给一个入口，不把列表当错误 -->
    <UCard v-if="!isAuthed" class="mt-6">
      <p class="text-sm text-muted">登录后即可管理你的简历。</p>
      <template #footer>
        <UButton label="登录" @click="loginOpen = true" />
      </template>
    </UCard>

    <template v-else>
      <div v-if="isLoading" class="mt-6 grid gap-3">
        <USkeleton class="h-20 w-full" />
        <USkeleton class="h-20 w-full" />
      </div>

      <UCard v-else-if="!resumes?.length" class="mt-6">
        <p class="text-sm text-muted">还没有简历。点右上角「新建简历」开始。</p>
      </UCard>

      <ul v-else class="mt-6 grid gap-3">
        <li v-for="item in resumes" :key="item.id">
          <UCard>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <NuxtLink
                  :to="`/my-resumes/draft/${item.id}`"
                  class="truncate font-medium text-highlighted hover:text-primary"
                >
                  {{ item.name }}
                </NuxtLink>
                <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span
                    >{{ item.locale }} · rev {{ item.revision }} · 更新于 {{ formatUpdatedAt(item.updatedAt) }}</span
                  >
                  <UBadge :color="item.publishedAt ? 'primary' : 'neutral'" variant="subtle" size="sm">
                    {{ item.publishedAt ? '已发布' : '未发布' }}
                  </UBadge>
                </p>
              </div>

              <div class="flex items-center gap-1">
                <UButton
                  :icon="item.publishedAt ? 'i-lucide-globe' : 'i-lucide-globe-lock'"
                  size="xs"
                  color="neutral"
                  :variant="item.publishedAt ? 'soft' : 'ghost'"
                  :loading="publishBusyId === item.id"
                  :aria-label="item.publishedAt ? `取消发布「${item.name}」` : `发布「${item.name}」`"
                  :title="publishTitle(item)"
                  @click="togglePublished(item)"
                />
                <UButton
                  icon="i-lucide-star"
                  size="xs"
                  color="neutral"
                  :variant="item.isDefault ? 'soft' : 'ghost'"
                  :disabled="item.isDefault || !item.publishedAt"
                  :loading="defaultBusyId === item.id"
                  :aria-label="item.isDefault ? '已是默认展示' : `把「${item.name}」设为默认展示`"
                  :title="starTitle(item)"
                  @click="setDefault(item.id)"
                />
                <UButton
                  icon="i-lucide-text-cursor-input"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  label="重命名"
                  @click="askRename(item)"
                />
                <UButton :to="`/my-resumes/draft/${item.id}`" icon="i-lucide-pencil" size="xs" label="继续编辑" />
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="ghost"
                  label="删除"
                  :loading="busyId === item.id"
                  @click="removeResume(item.id, item.name)"
                />
              </div>
            </div>
          </UCard>
        </li>
      </ul>
      <!-- 服务端分页：总数来自接口，翻页改 `page` 后由 useAsyncData 的 watch 重新取数 -->
      <div v-if="total > PAGE_SIZE" class="mt-4 flex items-center justify-between gap-3">
        <p class="text-sm text-muted">共 {{ total }} 份简历</p>
        <UPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="total" />
      </div>

      <UModal v-model:open="renameOpen" title="重命名简历">
        <template #body>
          <UFormField label="简历名称" :hint="`${renameDraft.trim().length}/80`">
            <UInput
              v-model="renameDraft"
              autofocus
              maxlength="80"
              placeholder="例如：前端工程师 · 2026"
              @keydown.enter.prevent="submitRename"
            />
          </UFormField>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton color="neutral" variant="ghost" label="取消" @click="renameOpen = false" />
            <UButton label="保存" :loading="renaming" :disabled="!canSubmitRename" @click="submitRename" />
          </div>
        </template>
      </UModal>
    </template>

    <ResumeAdminLoginModal v-model:open="loginOpen" />
  </main>
</template>
