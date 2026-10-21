<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import {
  normalizeApiError,
  resolveApiErrorMessage,
  resumeDocumentSchema,
  fromCustomSectionDraft,
  type FormSegmentSchema,
  type ResumeCustomSectionNode,
  type ResumeDate,
  type ResumeDocument,
  type ResumeSection,
} from '@rs/common'
import { queryKeys } from '~/lib/query-keys'
// ⚠️ layer 的组件**不走自动导入**（实测 `Failed to resolve component`），必须显式按层路径引入。
// 这也和工作台的写法一致（见 `ResumeDraftWorkspace.vue`）。
import CustomSectionField from '#layers/ui/app/components/resume/CustomSectionField.vue'
import ResumeModuleList from '#layers/ui/app/components/resume/ResumeModuleList.vue'
import { createResumeApi } from '../../../apis/resume'
import { resumeEditSegments } from '../../../config/resume-edit-schemas'
import { assignMissingIds } from '../../../utils/resume-edit-form'
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
  /** 在 `content.sections` 里的下标 —— `v-model` 要能整体替换这个区块，所以需要可寻址 */
  index: number
  id: string
  key: string
  type: string
  label: string
  icon: string
  data: Record<string, unknown>
  segments: FormSegmentSchema[]
}

const editableSections = computed<EditableSection[]>(() =>
  (document.value?.content.sections ?? []).map((section: ResumeSection, index: number) => ({
    index,
    id: section.id,
    key: `${section.type}-${section.id}`,
    type: section.type,
    label: section.title,
    icon: section.icon ?? 'i-lucide-file-text',
    // 契约的 data 是判别联合；表单按"一层字段 + 数组"读写，这里只是形状放宽，不改数据
    data: section.data as unknown as Record<string, unknown>,
    segments: resumeEditSegments[section.type] ?? [],
  })),
)

/** 没有字段表的模块：自定义模块走专属编辑器，其余只显示标题 */
const uneditableSections = computed(() =>
  editableSections.value.filter(section => !section.segments.length && section.type !== 'custom'),
)

/**
 * 左列表用的模块摘要（`ResumeModuleList` 的入参）。
 *
 * `locked` 标记基本信息：契约要求恰有一个 profile，界面上也不该让它被拖到别处。
 */
const moduleListSections = computed(() =>
  editableSections.value.map(section => ({
    id: section.id,
    key: section.type,
    label: section.label,
    icon: section.icon,
    locked: section.type === 'profile',
  })),
)

// ── 模块选择（左列表 → 右面板）──────────────────────────
// 交互参考 demo 的 `/layout-editor`：**左侧只负责"有谁、什么顺序、选哪个"，
// 右侧只渲染当前选中的那一个模块**。所以这里不需要"折叠"状态 —— 一屏只有一个模块。
const selectedId = ref<string | null>(null)

const selectedSection = computed(() => editableSections.value.find(section => section.id === selectedId.value) ?? null)

// 初次进入默认选第一个；选中的模块被删除后回退到第一个
watch(
  editableSections,
  list => {
    if (!list.length) {
      selectedId.value = null
      return
    }
    if (!list.some(section => section.id === selectedId.value)) selectedId.value = list[0]!.id
  },
  { immediate: true },
)

/**
 * 模块顺序（完整 id 数组，含隐藏项）——与契约 `display.sections.order` **同一份数组**。
 *
 * 不在这里复制成局部 state：契约要求 order 完整覆盖所有模块，复制一份就要写同步逻辑，
 * 一旦漏同步就会保存失败。直接双向绑到文档字段，拖拽结果立刻成为待保存状态。
 */
const sectionOrder = computed({
  get: () => document.value?.display.sections.order ?? [],
  set: (value: string[]) => {
    if (document.value) document.value.display.sections.order = value
  },
})

/** 隐藏 / 显示某个模块：只动 `hidden`，顺序不变（契约要求顺序永远完整） */
function toggleSectionHidden(id: string) {
  const hidden = document.value?.display.sections.hidden
  if (!hidden) return
  const index = hidden.indexOf(id)
  if (index >= 0) hidden.splice(index, 1)
  else hidden.push(id)
}

// ── 自定义模块（多实例）──────────────────────────────────
// 与 web 工作台共用 `packages/ui` 的 `CustomSectionField`（契约 ⇄ 编辑态草稿的唯一转换点），
// 差别只在落盘时机：这里是**点保存时随整份文档提交**，不是自动保存。
const customSections = computed(() => editableSections.value.filter(section => section.type === 'custom'))

/** 按 id 取回可写的契约区块本体（不是拷贝 —— 编辑器要写回它） */
function customSectionOf(id: string): ResumeCustomSectionNode | undefined {
  return document.value?.content.sections.find(
    (section): section is ResumeCustomSectionNode => section.type === 'custom' && section.id === id,
  )
}

function addCustom() {
  if (!document.value) return
  const id = crypto.randomUUID() as string
  document.value.content.sections.push(
    fromCustomSectionDraft({ title: '新模块', description: '', view: 'richText', items: [], timeline: [] }, { id }),
  )
  // 同时进排布，否则它会"存在于文档却不在编排里"——契约要求 order 覆盖全部模块，漏了会保存失败
  document.value.display.sections.order.push(id)
  document.value.display.sections.slot[id] = 'main'
  // 新增后直接**选中**它：右栏立刻显示编辑面板，用户不用再去左列表找
  selectedId.value = id
}

function removeCustom(id: string) {
  const section = customSectionOf(id)
  if (!document.value || !section) return
  if (!window.confirm(`删除「${section.title}」？该模块的内容会一并移除，保存后不可恢复。`)) return
  document.value.content.sections = document.value.content.sections.filter(item => item.id !== id)
  document.value.display.sections.order = document.value.display.sections.order.filter(item => item !== id)
  document.value.display.sections.hidden = document.value.display.sections.hidden.filter(item => item !== id)
  delete document.value.display.sections.slot[id]
  delete document.value.display.sections.overrides[id]
}

const isLoading = computed(() => loadStatus.value === 'pending')

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
  <!-- ⚠️ 不要给这里加 `max-w-*`：编辑页是**两栏工作台**，左列表 + 右表单，
       宽度受限会让右侧表单挤成窄条（Owner 明确要求铺满）。需要限宽的是正文段落，
       那类元素（如下面的说明文字）自己带 `max-w-2xl`。 -->
  <div class="w-full space-y-6 p-2 lg:p-4 3xl:p-6">
    <!-- 操作条：**页面内 sticky**，随滚动常驻顶部，按钮只出现这一次。
         ⚠️ 曾经试过"页面具名插槽 → 布局转发到页头"，**Vue 编译器直接报错**
         （`Codegen node is missing for element/if/for node`）—— 页面组件的根模板
         不允许写具名插槽（会被当成匿名 fragment）。所以改用页面自带的 sticky 条：
         同样"只出现一次 + 始终可见"，且不依赖布局插槽机制。 -->
    <div
      class="sticky top-0 z-10 -mx-2 mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-default bg-default/90 px-2 py-2 backdrop-blur lg:-mx-4 lg:px-4 3xl:-mx-6 3xl:px-6"
    >
      <p class="max-w-2xl text-xs leading-5 text-muted">
        改的是内容本身，保存后公开站看到的也是这份；展示设置在公开页调，只存在你自己的浏览器里。
      </p>
      <div class="flex items-center gap-2">
        <UButton to="/resume" color="neutral" variant="ghost" icon="i-lucide-arrow-left" label="返回" />
        <UButton :loading="saving" :disabled="isLoading || !document" icon="i-lucide-save" label="保存" @click="save" />
      </div>
    </div>

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

      <!-- 两栏：左 = 模块列表（排序 / 显隐 / 选中），右 = 当前选中模块的编辑面板。
           交互参考 demo 的 `/layout-editor`：一屏只编辑一个模块，不必一路下滑。
           左列表是 `packages/ui` 的共享组件（web 端也能用同一套排序与选中交互）。 -->
      <div class="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <!-- 左：模块列表 -->
        <aside class="lg:sticky lg:top-6 lg:self-start">
          <UCard :ui="{ body: 'p-3 sm:p-3' }">
            <template #header>
              <div class="flex items-center gap-2">
                <h3 class="text-xs font-semibold text-dimmed">模块（拖拽排序）</h3>
                <span class="ml-auto text-xs text-dimmed">{{ moduleListSections.length }}</span>
              </div>
            </template>

            <ResumeModuleList
              v-model:order="sectionOrder"
              :sections="moduleListSections"
              :hidden="document.display.sections.hidden"
              :selected="selectedId ?? undefined"
              @select="selectedId = $event"
              @toggle-hidden="toggleSectionHidden"
            />

            <div class="mt-3 border-t border-default pt-3">
              <UButton block icon="i-lucide-plus" variant="soft" size="sm" label="添加自定义模块" @click="addCustom" />
              <p class="mt-2 text-xs text-muted">
                预设模块不可删除；自定义模块（{{ customSections.length }} 个）可增删。
              </p>
            </div>
          </UCard>
        </aside>

        <!-- 右：当前模块的编辑面板 -->
        <div class="min-w-0">
          <ResumeEditPanel
            v-if="selectedSection"
            :label="selectedSection.label"
            :icon="selectedSection.icon"
            :type="selectedSection.type"
          >
            <template #actions>
              <UButton
                v-if="selectedSection.type === 'custom'"
                icon="i-lucide-trash-2"
                size="xs"
                color="error"
                variant="ghost"
                label="删除模块"
                @click="removeCustom(selectedSection.id)"
              />
            </template>

            <MySchemaForm
              v-if="selectedSection.segments.length"
              :root="selectedSection.data"
              :segments="selectedSection.segments"
            >
              <!-- 日期只读：字段类型表达不了契约的日期联合，先如实展示，不做一个会写坏数据的文本框 -->
            </MySchemaForm>

            <!-- 自定义模块：复用 `packages/ui` 的字段适配层（与 web 工作台同一份），
                 只是把"自动保存"换成"随本页保存按钮一起提交"。
                 `v-model` 绑的是**数组里的那个区块本体**：适配层内部完成"草稿 ⇄ 契约"转换后
                 把完整区块 emit 回来，这里只做整体替换，不自己拼形状。 -->
            <CustomSectionField
              v-else-if="selectedSection.type === 'custom'"
              v-model="document.content.sections[selectedSection.index] as ResumeCustomSectionNode"
            />

            <p v-else class="text-sm text-muted">这个模块还没有对应的表单，内容保持原样。</p>
          </ResumeEditPanel>

          <UCard v-else>
            <p class="text-sm text-muted">左侧选一个模块开始编辑。</p>
          </UCard>
        </div>
      </div>

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
    </template>
  </div>
</template>
