<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import { createResumeSchema, normalizeApiError, resolveApiErrorMessage } from '@rs/common'
import { queryKeys } from '~/lib/query-keys'
import { createResumeApi } from '../../apis/resume'
import { resumeCreateSections } from '../../config/resume-create-schemas'
import { createEmptyCreateForm, describeCreateIssues, toCreateResumeDto } from '../../utils/resume-create-form'

/**
 * 新建简历（`/resume/new`）。
 *
 * 页面只做三件事（设计 §3）：组织区块与增删交互、维护一份稀疏输入状态、提交调 `POST /resume`。
 * 字段怎么渲染交给 `packages/ui` 的 `MySchemaForm`（web 草稿页用的是同一个组件），
 * "编辑态 → 契约"的转换交给 `utils/resume-create-form.ts`。
 *
 * 布局与概览页一致：后台通用的 `has-sidebar`，不再叠二级侧栏。
 */
definePageMeta({
  layout: 'has-sidebar',
  title: '新建简历',
  middleware: 'auth',
})

const toast = useToast()
const { signOut } = useAuthState()
const api = createResumeApi()
const queryCache = useQueryCache()

const form = reactive(createEmptyCreateForm())
const pending = ref(false)
const errorMessage = ref('')
const uploadedSoon = ref(false)

/** 已填内容的区块数：给用户一个"填了多少"的正反馈，同时不暗示"必须填满" */
const filledSections = computed(() => {
  const counts = [
    form.profile.name.trim() !== '',
    form.highlights.items.length > 0,
    form.education.items.length > 0,
    form.experience.items.length > 0,
    form.projects.items.length > 0,
    form.capabilities.groups.length > 0,
    form.evaluations.lines.length > 0,
  ]

  return counts.filter(Boolean).length
})

/** 上传入口本期是**占位**（设计 P3）：只提示，不做假交互 */
function notifyUploadSoon() {
  uploadedSoon.value = true
  toast.add({
    title: '上传解析还没接上',
    description: '后续会走 /resume/new/import：上传 → 解析 → 概览 → 确认。先用下面的表单手动填写。',
    color: 'info',
    icon: 'i-lucide-construction',
  })
}

/**
 * 提交：先用契约自检，再发请求。
 *
 * 自检（`createResumeSchema.safeParse`）不是重复劳动 —— 它把"半截条目"这类
 * 必然被后端拒绝的输入**在请求前**指出来，否则用户只能看到一句「请求参数有误」。
 * 自检通过后发的是 `parsed.data`（已 trim 归一），而不是原始对象。
 */
async function handleSubmit() {
  errorMessage.value = ''

  const parsed = createResumeSchema.safeParse(toCreateResumeDto(form))
  if (!parsed.success) {
    errorMessage.value = describeCreateIssues(parsed.error.issues)
    return
  }

  pending.value = true

  try {
    const result = await api.create(parsed.data)
    // 概览页的列表走 colada 缓存：刚建的那份必须让旧缓存失效，否则返回去还是看不到它
    await queryCache.invalidateQueries({ key: queryKeys.resume.list() })
    toast.add({
      title: '简历已创建',
      description: `「${result.resume.name}」已生成初始草稿（rev ${result.revision}），可到公开站查看。`,
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
    await navigateTo('/resume')
  } catch (error) {
    const normalized = normalizeApiError(error)
    // 令牌失效：清会话并送登录页，别让用户对着一个必然失败的按钮反复点
    if (normalized.code === 401) {
      signOut()
      await navigateTo('/login')
      return
    }
    errorMessage.value = resolveApiErrorMessage(normalized)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <!-- 页面标题由布局的页头渲染（`route.meta.title`），这里只放说明与返回，避免首屏重复占位 -->
      <div>
        <p class="max-w-2xl text-sm leading-6 text-muted">
          先写基本信息和记得的经历，其余留空也行：创建后会补成结构完整的草稿，再到编辑页继续填。
        </p>
        <p class="mt-1 text-xs text-muted">已填 {{ filledSections }} / 7 个区块</p>
      </div>

      <UButton to="/resume" color="neutral" variant="ghost" icon="i-lucide-arrow-left" label="返回" />
    </header>

    <!-- 上传入口：占位（设计 P3 —— 只提示，不做假交互） -->
    <UCard>
      <div class="flex flex-wrap items-center gap-4">
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <UIcon name="i-lucide-sparkles" class="size-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted">上传简历，由 AI 帮你填</p>
          <p class="mt-1 text-sm leading-6 text-muted">
            支持 PDF / Word / md / txt，也可以直接粘贴文本。这块还在开发中，先按下面的表单填写。
          </p>
        </div>
        <UButton color="neutral" variant="outline" icon="i-lucide-upload" label="上传文件" @click="notifyUploadSoon" />
      </div>
    </UCard>

    <!-- 简历本身的身份（不进 document，是简历表的字段） -->
    <UCard :ui="{ body: 'p-5 sm:p-5' }">
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="简历名" help="给自己看的名字，可随时改">
          <UInput v-model="form.name" class="w-full" placeholder="如：全栈方向 2026" />
        </UFormField>
        <UFormField label="语言标识" help="1～20 位字母、数字或连字符，如 zh / en">
          <UInput v-model="form.locale" class="w-full" placeholder="zh" />
        </UFormField>
      </div>
    </UCard>

    <!-- 七个区块 -->
    <UCard v-for="section in resumeCreateSections" :key="section.key" :ui="{ body: 'p-5 sm:p-5' }">
      <template #header>
        <div class="flex flex-wrap items-center gap-2">
          <UIcon :name="section.icon" class="size-4 text-muted" />
          <h3 class="text-sm font-semibold text-highlighted">{{ section.label }}</h3>
          <span class="text-xs text-muted">{{ section.hint }}</span>
        </div>
      </template>

      <MySchemaForm :root="form" :segments="section.segments" />
    </UCard>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="还不能创建"
      :description="errorMessage"
    />

    <div class="flex items-center justify-end gap-2 pb-6">
      <UButton to="/resume" color="neutral" variant="ghost" label="取消" />
      <UButton :loading="pending" icon="i-lucide-check" label="创建简历" @click="handleSubmit" />
    </div>
  </div>
</template>
