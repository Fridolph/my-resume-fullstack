<script setup lang="ts">
import { resumeEditSegments, toResumeContent, type ResumeDocument } from '@rs/common'
import { resumeDisplayMock } from '#layers/public-resume/app/mock/resume-display'
import { createResumeDraftApi } from '#layers/public-resume/app/apis/resume-draft'
import ResumePublicHeader from './ResumePublicHeader.vue'
import ResumePublicView from './ResumePublicView.vue'
import ResumeSettingsDrawer from './ResumeSettingsDrawer.vue'
import { PUBLIC_RESUME_DOCUMENT_KEY } from '#layers/public-resume/app/composables/usePublicResumeDocument'

/**
 * 公开简历页的外壳：**主题变量注入 + 空态 / 失败态**，正文交给 `ResumePublicView`。
 *
 * `/` 与 `/resume/:id` 共用它 —— 两个页面只差"数据从哪来"，其余必须完全一致。
 *
 * ## 主题变量为什么注入到 `<body>`
 *
 * 简历主题是一组 CSS 变量。挂在本容器上只能影响容器内部，而**访客侧的弹层是 teleport 到
 * `<body>` 的**（登录弹窗、提示），它们解析不到容器上的变量，会出现"页面是深色、弹窗是浅色"。
 * 通过 `useHead({ bodyAttrs: { style } })` 挂到 body，容器内外一致。
 */
const props = defineProps<{
  document: ResumeDocument | null
  /** 这份简历的 id（就地编辑保存时要用；缺省则只读，不尝试落盘） */
  resumeId?: number | null
  /** 空态原因：`no-default` = 作者还没设默认；`not-found` = 这份不存在 */
  emptyReason: 'no-default' | 'not-found' | null
  /** 真实故障（网络 / 5xx）：与"空态"分开呈现，前者可重试、后者是业务状态 */
  isError?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()

/** 展示设置抽屉：只有拿到文档时才有内容可展示 */
const displayOpen = ref(false)

// ── 就地编辑（作者视角）──────────────────────────────────
// 旧公开页的能力：**不用跳去列表/工作台**，在当前页切到编辑模式即可拖拽排序、
// 上下移动、编辑内容、隐藏/显示模块。这里把它接回来。
//
// 权限与工作台一致：`isAuthed && isAdmin && canEditSections`（工作台就是这三个条件）。
// 没有权限的访客只会看到只读页面 —— 编辑开关本身由 `ResumeAccountMenu` 按权限决定是否渲染。
const { isAuthed, isAdmin } = useAuthState()
const { canEditSections } = usePermission()
const canEdit = computed(() => isAuthed.value && isAdmin.value && canEditSections.value)

/** 编辑模式：默认关（先看访客视角），由身份菜单里的开关切换 */
const editMode = ref(false)
const editable = computed(() => canEdit.value && editMode.value)

/** 模块内容编辑抽屉 */
const editorOpen = ref(false)
const editingId = ref<string | null>(null)

function openEditor(id: string) {
  editingId.value = id
  editorOpen.value = true
}

/** 当前编辑模块的字段表（web 自己维护一份，避免反向依赖 admin layer） */
const editingSegments = computed(() => {
  const section = props.document?.content.sections.find(item => item.id === editingId.value)
  return section ? (resumeEditSegments[section.type] ?? []) : []
})

/**
 * 就地编辑要能落盘，否则"改了刷新就没了"。
 *
 * 用工作台同一套保存接口（`PUT /resume/:id/draft`，带 revision 条件更新），
 * 但**由本页自己防抖调用**：这里没有工作台那套完整状态机（冲突面板、备份导出），
 * 只保证"改动会被保存"，冲突时静默重取（访客/作者在看公开页时不该被弹窗打断）。
 */
const draftApi = createResumeDraftApi()
let saveTimer: ReturnType<typeof setTimeout> | undefined
let saving = false

/**
 * 把当前文档写回服务端。
 *
 * 保存前**先读一次 revision**：公开页可能和工作台同时开着，直接拿一个陈旧的 revision 去写
 * 必然 409。这里的取舍是"公开页不做冲突面板" —— 读到最新 revision 后再写，
 * 冲突概率已很低；真失败就静默（访客/作者在公开页不该被弹窗打断），
 * 内容仍在页面上，刷新后能看到服务端的真实状态。
 */
async function persistDocument() {
  const doc = props.document
  const id = props.resumeId
  if (!doc || !id || !editable.value || saving) return
  saving = true
  try {
    const current = await draftApi.read(String(id))
    await draftApi.save(String(id), {
      expectedRevision: current.revision,
      document: {
        ...JSON.parse(JSON.stringify(doc)),
        // ⚠️ **展示配置不入库**（Owner 2026-10-15 的决定：版式 / 主题 / 背景留在浏览器本地）。
        // 而 `useResumeDisplay.adopt()` 是**引用共享**的 —— 本机调的展示会直接改到
        // `props.document.display` 上。若原样回写，"本机偏好"就会被顺手写进服务端，
        // 变成"一个人调主题、所有访客都跟着变"。所以回写前换回**加载时的快照**。
        display: serverDisplay.value ?? JSON.parse(JSON.stringify(doc)).display,
      },
    })
  } catch {
    // 静默：见上面的取舍说明
  } finally {
    saving = false
  }
}

function schedulePersist() {
  if (!import.meta.client || !editable.value || !props.resumeId) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void persistDocument(), 1500)
}

/**
 * 服务端那份展示配置的快照（见 `persistDocument` 里的说明）。
 *
 * 用**深拷贝**而不是引用：`adopt()` 之后两边是同一个对象，留引用等于没留快照。
 */
const serverDisplay = ref<unknown>(null)

/**
 * 真正接上落盘：**内容变了才保存**。
 *
 * - 只监听 `content`：展示配置按 Owner 的决定存本机，不该因为"换了个主题"就发一次写请求；
 * - `documentReady` 用来跳过首帧：`props.document` 从 `null` 变成真实文档时也会触发一次 watch，
 *   那一次保存毫无意义（等于把刚读到的内容原样写回，还会白白占用一次 revision）。
 */
const documentReady = ref(false)
watch(
  () => props.document?.content,
  () => {
    if (!documentReady.value) return
    schedulePersist()
  },
  { deep: true },
)

onMounted(() => {
  // 等这一帧的渲染与 watch 都跑完，再允许保存
  void nextTick(() => {
    documentReady.value = true
  })
})

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

/**
 * 生效的展示配置 = **文档基线 + 本机覆盖**。
 *
 * Owner 口径（2026-10-15）：版式 / 主题这类**样式配置留在浏览器本地**，不入库。
 * `adopt()` 把文档的 display 接成可写基线，设置面板的改动直接落到它上面
 *（引用共享），并由 store 自动存进 localStorage —— 所以公开页上访客也能调，
 * 刷新后还是他调过的样子，而服务端数据不受影响。
 */
const { config: displayConfig, adopt, setEditable, applyDrop, toggleSection, saveState } = useResumeDisplay()

watch(
  () => props.document?.display,
  display => {
    if (!display) return
    // 先留快照（深拷贝），再 adopt —— adopt 之后 props.document.display 就是"本机可写的基线"
    serverDisplay.value = JSON.parse(JSON.stringify(display))
    adopt(display)
  },
  { immediate: true },
)

// 打开 store 的落盘闸门：它只在"编辑态"写 localStorage（见 `scheduleSave`），
// 不开的话设置面板的改动能改到内存、却存不下来 —— 实测表现为"点了三栏没反应、localStorage 也没有"。
// 公开页的语义是"访客可以调自己的观感，只存在本机"，所以这里恒为 true。
onMounted(() => setEditable(true))
onBeforeUnmount(() => setEditable(false))

/**
 * 「重置展示配置」：把本机覆盖还原成**文档里那份**（即作者设定的样式）。
 *
 * 为什么不是"重置成硬编码默认值"：作者给这份简历调过主题与版式，那是作品的一部分；
 * 用户点重置的合理预期是"回到作者的样子"，而不是"回到系统出厂样"。
 * 只是把 `localStorage` 里的本机覆盖丢掉，不写服务端（样式本来就不入库）。
 */
function resetDisplay() {
  if (!serverDisplay.value) return
  adopt(serverDisplay.value as Parameters<typeof adopt>[0])
  toast.add({ title: '已恢复', description: '展示配置已回到这份简历的设定。', color: 'success' })
}

const toast = useToast()

/**
 * 把当前文档交给展示设置面板（`provide` 而不是 props 一层层传）：
 * 「区块显隐」tab 需要**真实文档里的模块清单** —— 它此前读的是 legacy mock
 *（`useResumeContent()` 的 `sections: []`），所以那个 tab 永远是空的。
 */
provide(
  PUBLIC_RESUME_DOCUMENT_KEY,
  computed(() => props.document),
)

/** 主题变量用**生效配置**（不是文档原始值），否则本机调整看不出效果 */
const variables = useResumeThemeVariables(() => displayConfig.value ?? props.document?.display ?? resumeDisplayMock)

/** 内容也随文档走（本机覆盖只涉及展示，不动内容） */
const content = computed(() => (props.document ? toResumeContent(props.document) : null))

/** 页头品牌名：取文档里的品牌配置，回退到作者姓名，再回退到一个通用词 */
const brandName = computed(
  () =>
    props.document?.display.brand.title ||
    props.document?.display.brand.logoText ||
    props.document?.content.sections.find(section => section.type === 'profile')?.data.name ||
    '简历',
)

useHead({
  bodyAttrs: {
    style: computed(() =>
      Object.entries(variables.value)
        .map(([key, value]) => `${key}:${value}`)
        .join(';'),
    ),
  },
})
</script>

<template>
  <div class="min-h-screen" :style="variables">
    <!-- 页头常驻（访客也要有登录入口与品牌），空态与故障态同样保留 —— 否则整页没有任何出口 -->
    <ResumePublicHeader
      :brand="brandName"
      :edit-mode="editMode"
      :save-label="saveState === 'pending' ? '保存中…' : saveState === 'saved' ? '已保存' : ''"
      @display="displayOpen = true"
      @update:edit-mode="editMode = $event"
      @reset="resetDisplay"
    />

    <template v-if="document && content">
      <ResumePublicView
        :document="document"
        :config="displayConfig"
        :content="content"
        :editable="editable"
        @hide="toggleSection"
        @edit="openEditor"
      />
    </template>

    <!-- 加载中：公开页要在 SSR 就出内容，客户端首帧基本不会走到这里；留一个克制的占位 -->
    <div v-else-if="loading" class="grid min-h-screen place-items-center">
      <div class="text-center text-sm text-muted">
        <UIcon name="i-lucide-loader-circle" class="mx-auto size-6 animate-spin" />
        <p class="mt-3">正在读取简历…</p>
      </div>
    </div>

    <!-- 故障：网络 / 服务端问题，可重试 -->
    <div v-else-if="isError" class="grid min-h-screen place-items-center px-4">
      <UCard class="w-full max-w-md">
        <div class="space-y-3 text-center">
          <UIcon name="i-lucide-cloud-alert" class="mx-auto size-8 text-error" />
          <h1 class="text-lg font-semibold">暂时读不到这份简历</h1>
          <p class="text-sm text-muted">服务暂时不可用，请稍后重试。</p>
          <UButton icon="i-lucide-refresh-cw" label="重试" @click="emit('retry')" />
        </div>
      </UCard>
    </div>

    <!-- 空态：404 属预期内状态，不是故障 -->
    <div v-else class="grid min-h-screen place-items-center px-4">
      <UCard class="w-full max-w-md">
        <div class="space-y-3 text-center">
          <UIcon
            :name="emptyReason === 'no-default' ? 'i-lucide-star-off' : 'i-lucide-file-question'"
            class="mx-auto size-8 text-muted"
          />
          <template v-if="emptyReason === 'no-default'">
            <h1 class="text-lg font-semibold">还没有公开的简历</h1>
            <p class="text-sm text-muted">
              作者还没有设置「默认展示」的简历。在自己的简历列表里点一下 ★ 就能把它放到这里。
            </p>
            <UButton to="/my-resumes" icon="i-lucide-files" label="去我的简历" />
          </template>
          <template v-else>
            <h1 class="text-lg font-semibold">这份简历不存在</h1>
            <p class="text-sm text-muted">它可能已被删除，或者链接不完整。</p>
            <UButton to="/" icon="i-lucide-house" label="回到首页" />
          </template>
        </div>
      </UCard>
    </div>
    <!-- 展示设置：**原来的完整抽屉**（布局与风格 / 主题与背景 / 区块显隐）。
         Owner 明确它属于公开页（访客也可能想调自己的观感），不在工作台。 -->
    <ResumeSettingsDrawer v-if="document" v-model:open="displayOpen" />

    <!-- 就地编辑：拖拽排序 / 上下移动 / 隐藏 由 `ResumePageContainer` + display store 处理；
         模块内容编辑走这个抽屉。全部留在当前页，不再跳列表。 -->
    <ResumeDocumentEditorDrawer
      v-if="document"
      v-model:open="editorOpen"
      :document="document"
      :section-id="editingId"
      :segments="editingSegments"
    />
  </div>
</template>
