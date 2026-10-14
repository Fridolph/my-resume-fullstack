<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import {
  normalizeApiError,
  resolveApiErrorMessage,
  resumeDocumentSchema,
  type FormSegmentSchema,
  type ResumeDate,
  type ResumeDocument,
  type ResumeSection,
} from '@rs/common'
import { queryKeys } from '~/lib/query-keys'
import { createResumeApi } from '../../../apis/resume'
import { resumeEditSegments } from '../../../config/resume-edit-schemas'
import { assignMissingIds, formatResumeDate } from '../../../utils/resume-edit-form'
import { describeContractIssues } from '../../../utils/schema-issues'

/**
 * 编辑简历（`/resume/:id/edit`）。
 *
 * ## 为什么是"就地编辑文档"
 *
 * 页面拿到的是**完整文档**，而表单只覆盖其中一部分字段。若先转成一份"编辑态模型"、
 * 提交时再从模型重建文档，那些没被表单覆盖的内容（`hero` / `interests` / `stats` / `gallery` /
 * 评分维度 / `display` 配置）就会被悄悄丢掉 —— 编辑一次等于删一次。
 *
 * 所以这里：**root 直接是文档里那个模块的 `data` 对象**，表单就地改它的字段，
 * 其余字段随对象原样保存。没有字段表的模块只展示、不提供表单，也不会被改写。
 *
 * ## 保存
 *
 * 提交整份文档，并带上进入页面时拿到的 `revision`：后端按它做条件更新，
 * 别的窗口改过就返回 409，页面提示"先刷新再改"，而不是覆盖别人的改动。
 */
definePageMeta({
  layout: 'has-sidebar',
  title: '编辑简历',
  middleware: 'auth',
})

const route = useRoute()
const toast = useToast()
const api = createResumeApi()
const queryCache = useQueryCache()
const { signOut } = useAuthState()

const resumeId = computed(() => Number(route.params.id))

/**
 * 用 `useAsyncData` 而不是在 `onMounted` 里手动加载：服务端就能取到文档，
 * 首屏直接渲染出字段，不必先闪一屏骨架。
 */
const {
  data: loaded,
  error: loadError,
  status: loadStatus,
  refresh: reload,
} = await useAsyncData(
  () => `resume-edit-${route.params.id}`,
  () => api.getDraft(resumeId.value),
)

/** 本地编辑副本：改动只发生在这里；保存成功后以服务端返回的结果为准 */
const document = ref<ResumeDocument | null>(null)
const name = ref('')
const loadedName = ref('')
const revision = ref(1)
const saving = ref(false)
const saveError = ref('')

watchEffect(() => {
  if (!loaded.value) {
    return
  }

  document.value = JSON.parse(JSON.stringify(loaded.value.document)) as ResumeDocument
  name.value = loaded.value.resume.name
  loadedName.value = loaded.value.resume.name
  revision.value = loaded.value.revision
})

/** 一个可编辑模块：标题与图标取自文档，字段表按 `type` 查 */
interface EditableSection {
  key: string
  type: string
  label: string
  icon: string
  data: Record<string, unknown>
  segments: FormSegmentSchema[]
}

const editableSections = computed<EditableSection[]>(() =>
  (document.value?.content.sections ?? []).map((section: ResumeSection) => ({
    key: `${section.type}-${section.id}`,
    type: section.type,
    label: section.title,
    icon: section.icon ?? 'i-lucide-file-text',
    // 契约的 data 是判别联合；表单按"一层字段 + 数组"读写，这里只是形状放宽，不改数据
    data: section.data as unknown as Record<string, unknown>,
    segments: resumeEditSegments[section.type] ?? [],
  })),
)

/** 没有字段表的模块仍然列出来（只显示标题），避免"编辑页装作不认识它" */
const uneditableSections = computed(() => editableSections.value.filter(section => !section.segments.length))

const isLoading = computed(() => loadStatus.value === 'pending')

/** 哪些条目带日期：用于 `list-item-extra` 插槽的只读摘要 */
function hasDate(item: Record<string, unknown>): boolean {
  return 'date' in item
}

async function save() {
  if (!document.value) {
    return
  }

  saving.value = true
  saveError.value = ''

  try {
    // 先深拷贝再补 id：补出来的随机 id 属于"提交前的归一"，不该写回正在编辑的界面状态，
    // 否则用户每点一次保存，界面上的 id 都会换一轮。
    const prepared = assignMissingIds(JSON.parse(JSON.stringify(document.value)) as ResumeDocument)
    const parsed = resumeDocumentSchema.safeParse(prepared)
    if (!parsed.success) {
      saveError.value = describeContractIssues(parsed.error.issues)
      return
    }

    // 名字变了才发 PATCH：它是一次独立的局部修改，没必要每次保存都写一遍
    const nextName = name.value.trim()
    if (nextName !== loadedName.value) {
      await api.rename(resumeId.value, nextName)
      loadedName.value = nextName
    }

    const saved = await api.saveDraft(resumeId.value, {
      expectedRevision: revision.value,
      document: parsed.data,
    })

    revision.value = saved.revision
    document.value = saved.document
    await queryCache.invalidateQueries({ key: queryKeys.resume.list() })
    toast.add({
      title: '已保存',
      description: `版本更新到 rev ${saved.revision}`,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (problem) {
    const normalized = normalizeApiError(problem)
    if (normalized.code === 401) {
      signOut()
      await navigateTo('/login')
      return
    }
    saveError.value =
      normalized.code === 409
        ? '这份草稿在别处被改过了（另一个窗口，或公开站的草稿编辑器）。本次改动没有提交 —— 请刷新页面、确认两边内容后再改，避免覆盖别人的修改。'
        : resolveApiErrorMessage(normalized)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <p class="max-w-2xl text-sm leading-6 text-muted">
        这里改的是内容本身，保存后公开站看到的也是这份。日期与评分维度暂时在公开站的草稿工作台编辑。
      </p>

      <div class="flex items-center gap-2">
        <UButton to="/resume" color="neutral" variant="ghost" icon="i-lucide-arrow-left" label="返回" />
        <UButton :loading="saving" :disabled="isLoading || !document" icon="i-lucide-save" label="保存" @click="save" />
      </div>
    </header>

    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="读取失败"
      :description="loadError.message"
    >
      <template #actions>
        <UButton color="neutral" variant="outline" size="xs" label="重试" @click="reload()" />
      </template>
    </UAlert>

    <template v-else-if="isLoading">
      <UCard v-for="index in 3" :key="index" :ui="{ body: 'p-5 sm:p-5' }">
        <USkeleton class="h-4 w-1/3" />
        <USkeleton class="mt-4 h-10 w-full" />
      </UCard>
    </template>

    <template v-else-if="document">
      <!-- 简历身份：内部名称可改；其余是只读元信息 -->
      <UCard :ui="{ body: 'p-5 sm:p-5' }">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="简历名" help="给自己看的名字；正文里的姓名在「基本信息」模块里改">
            <UInput v-model="name" class="w-full" />
          </UFormField>
          <UFormField label="元信息">
            <p class="text-sm text-muted">
              id {{ resumeId }} · 文档 V{{ document.schemaVersion }} · rev {{ revision }}
            </p>
          </UFormField>
        </div>
      </UCard>

      <!-- 各模块：root 就是文档里的 data，没出现在表单里的字段会原样保留 -->
      <UCard v-for="section in editableSections" :key="section.key" :ui="{ body: 'p-5 sm:p-5' }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="section.icon" class="size-4 text-muted" />
            <h3 class="text-sm font-semibold text-highlighted">{{ section.label }}</h3>
            <span class="text-xs text-dimmed">{{ section.type }}</span>
          </div>
        </template>

        <MySchemaForm v-if="section.segments.length" :root="section.data" :segments="section.segments">
          <!-- 日期只读：字段类型表达不了契约的日期联合，先如实展示，不做一个会写坏数据的文本框 -->
          <template #list-item-extra="{ item }">
            <p v-if="hasDate(item)" class="text-xs text-muted">
              时间：{{ formatResumeDate(item.date as ResumeDate) }}
              <span class="ml-1 text-dimmed">（本页暂不可编辑）</span>
            </p>
          </template>
        </MySchemaForm>

        <p v-else class="text-sm text-muted">这个模块还没有对应的表单，内容保持原样。</p>
      </UCard>

      <UAlert
        v-if="uneditableSections.length"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="有模块暂不支持在此编辑"
        :description="`${uneditableSections.map(section => section.label).join('、')} 会保留原内容，不受本次保存影响。`"
      />

      <UAlert
        v-if="saveError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="还不能保存"
        :description="saveError"
      />

      <div class="flex items-center justify-end gap-2 pb-6">
        <UButton to="/resume" color="neutral" variant="ghost" label="取消" />
        <UButton :loading="saving" icon="i-lucide-save" label="保存" @click="save" />
      </div>
    </template>
  </div>
</template>
