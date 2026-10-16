<script setup lang="ts">
import type { FormSegmentSchema, ResumeCustomSectionNode, ResumeDocument, ResumeSection } from '@rs/common'
// ⚠️ layer 里的组件**不保证走自动导入**，与 `apps/admin/.../edit.vue` 保持同一写法：按层路径显式引入。
import CustomSectionField from '#layers/ui/app/components/resume/CustomSectionField.vue'

/**
 * 模块内容编辑抽屉（**文档驱动**）。
 *
 * ## 1. 边界：只改传进来的那份文档对象，不认任何 API
 *
 * `document` 是**对象本体**（不是副本）：本组件对 `document.content.sections[index]` 就地读写，
 * `MySchemaForm` / `CustomSectionField` 的 `v-model` 落到的就是那个区块对象。
 * `packages/ui` 只描述"能做什么"（表单怎么渲染、草稿怎么转契约），
 * **"谁可以做、什么时候写回服务端"是业务侧的事** —— 所以这里
 * 没有 `fetch`、没有 composable、没有防抖：保存由调用方页面统一负责（见下方 footer 说明）。
 * 好处是同一个抽屉能被公开页的自动保存、admin 的整份提交、乃至未来的离线编辑复用。
 *
 * ## 2. 为什么不用旧的 `ResumeSectionEditorDrawer`
 *
 * 那个抽屉绑在 `useResumeContent()` 上 —— 内容来自**本地 mock 状态**（`content.sections` 只是
 * `{id,key,label,icon}` 清单，真正的字段散在 `content.profile / experience / …` 里），
 * 它由 `config/resume-editor-schemas.ts` 按 `key` 查表，并自己触发防抖落盘。
 * 现在的公开页读的是**服务端契约文档**（`ResumeDocument`，来自 `@rs/common`）：字段在
 * `section.data` 这个判别联合里，模块由 `section.type` 区分。
 * 两者不是同一份数据源，硬接就会出现"抽屉里改的是 mock、页面显示的是服务端"的撕裂，
 * 所以这里新写一个，旧的那个保持原样不动（仍服务于工作台那条线）。
 *
 * ## 3. 为什么 `segments` 走 prop 而不是在这里 import
 *
 * 字段表（`resumeEditSegments` 等）是**纯数据描述**，已按三层归属判据上提到
 * `@rs/common` 的 `ui/resume-edit-segments.ts`；但"哪份字段表给哪个模块、什么时候是这一份"
 * 仍是各端的编排决定（web 面向公开页的就地编辑、admin 面向整份提交，将来完全可能分叉）。
 * 所以字段表由**调用方按 `section.type` 查好传进来**，组件本身对"有哪些字段"零假设 ——
 * 这样它既不依赖任何一端的 config，也不会在两端字段表分叉时被迫二选一。
 *
 * ## 4. 保存不在这个抽屉里
 *
 * `#footer` 只有「完成」（= 关闭）。内容改动是**就地**发生的，调用方页面监听文档变化后做
 * 防抖自动保存（公开页口径），所以这里**刻意不放"保存"按钮**：多一个写入口就会和自动保存
 * 各写一份，冲突时没人说得清哪份赢。
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  /** 要编辑的文档**本体**：组件就地修改它的 `content.sections`，不产生副本 */
  document: ResumeDocument
  /** 要编辑哪个模块；为 `null` / 找不到时显示空态 */
  sectionId?: string | null
  /** 该模块的字段表（调用方按 `section.type` 查好传入，见顶部第 3 点） */
  segments: FormSegmentSchema[]
}>()

/**
 * 命中的区块与它在数组里的**下标**。
 *
 * 为什么要下标：契约的 `data` 是判别联合，而 `v-model` 需要"能整体替换的写目标"
 * （`document.content.sections[i] = next`），只有下标能表达这一点 ——
 * 拿 `computed` 包出来的 `section` 是值、不是引用，写不回去。
 */
const part = computed<{ section: ResumeSection; index: number } | null>(() => {
  const index = props.document.content.sections.findIndex(section => section.id === props.sectionId)
  const section: ResumeSection | undefined = index >= 0 ? props.document.content.sections[index] : undefined
  return section ? { section, index } : null
})

/** 抽屉标题：找得到就用模块自己的标题（自定义模块的标题是用户填的），找不到给空态文案 */
const title = computed(() => (part.value ? `编辑「${part.value.section.title}」` : '编辑模块'))

/**
 * 表单的根对象。
 *
 * 表单按"一层字段 + 数组"读写（`listPath` 支持点号），契约的 `data` 形状更严
 * （判别联合），这里的断言只是**放宽形状读视图**，不改数据、也不越过契约 ——
 * 写回后仍由调用方保存前统一过 `resumeDocumentSchema`。
 */
const root = computed<Record<string, unknown>>(
  () => (part.value?.section.data ?? {}) as unknown as Record<string, unknown>,
)

/** 关闭：内容已经就地改完了，这里只需要把开关置回 false */
function finish() {
  open.value = false
}
</script>

<template>
  <MyDrawer v-model:open="open" :title="title" description="改动实时生效，并会自动保存" size="2xl">
    <!-- 空态：调用方还没选中模块（或选中的模块刚被删除） -->
    <p v-if="!part" class="text-sm text-muted">请选择一个模块。</p>

    <!-- 自定义模块：唯一一处「契约 ⇄ 编辑态草稿」转换，所以边界必须交给它，
         不要在这里自己拼形状。`v-model` 绑的是**数组里的那个区块本体**。 -->
    <CustomSectionField
      v-else-if="part.section.type === 'custom'"
      v-model="document.content.sections[part.index] as ResumeCustomSectionNode"
    />

    <!-- 预设模块：有字段表就渲染字段表单（增删 / 上下移由 `MySchemaForm` 自己处理） -->
    <MySchemaForm v-else-if="segments.length" :root="root" :segments="segments" />

    <!-- 没有字段表的模块：如实说明，不提供一个会写坏契约的空壳表单 -->
    <p v-else class="text-sm text-muted">这个模块还没有对应的表单，内容保持原样。</p>

    <template #footer>
      <!-- 这里**只有关闭，没有保存**：改动是就地发生的，落盘由调用方页面统一负责
           （公开页是防抖自动保存）。多一个写入口就会与自动保存互相覆盖。 -->
      <div class="flex w-full items-center justify-between gap-2">
        <span class="text-muted text-xs">改动会自动保存，关闭抽屉不会撤销</span>
        <UButton color="neutral" variant="ghost" label="完成" @click="finish" />
      </div>
    </template>
  </MyDrawer>
</template>
