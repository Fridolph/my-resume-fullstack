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
                <p class="mt-1 text-xs text-muted">
                  {{ item.locale }} · rev {{ item.revision }} · 更新于 {{ formatUpdatedAt(item.updatedAt) }}
                </p>
              </div>

              <div class="flex items-center gap-1">
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
    </template>

    <ResumeAdminLoginModal v-model:open="loginOpen" />
  </main>
</template>
