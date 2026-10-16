<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fromCustomSectionDraft,
  toCustomSectionDraft,
  type ResumeCustomSectionDraft,
  type ResumeCustomSectionNode,
} from '@rs/common'
import CustomSectionEditor from './CustomSectionEditor.vue'

/**
 * 自定义模块的**绑定适配层**：把契约里的 `custom` 区块 ⇄ 编辑态草稿接起来。
 *
 * ## 为什么必须有这一层，而且必须是"编辑器 → 契约"单向推送
 *
 * 编辑态（`ResumeCustomSectionDraft`：纯字符串、无 id）与契约区块形状不同，靠
 * `toCustomSectionDraft` / `fromCustomSectionDraft` 转换。这里踩过三个坑，都实测复现过：
 *
 * 1. ❌ 传**拷贝**进去（`:model-value="toCustomSectionDraft(section)"`）：`v-model` 写回的是那份
 *    拷贝，必须转回契约形状；而 `v-model` 只做 `x = value`，于是文档里存进了编辑态形状
 *    （`items: string[]`）→ **静默破坏契约**，保存时才报"字段不合法"。
 * 2. ❌ 依赖"父级给可写 computed"：`defineModel` 里是 `shallowRef`，编辑器对**对象属性**的就地
 *    改动（`v-model="draft.title"`）**不会触发 `update:modelValue`** —— 父级的 computed setter
 *    永远收不到，表现是"界面改了、保存也发了、服务端内容没变"。
 * 3. ❌ 在 `get()` 里重新构造草稿再深监听它：每次求值都是新对象，深监听永远认为"变了" → 死循环。
 *
 * 所以这里反过来：**草稿是本地可写状态，编辑器直接 v-model 它**（它内部对属性的就地改动能被
 * 本地深监听看到），再由本层**单向**把草稿转成契约区块 emit 出去。父级只做 `x = value`，
 * 不需要 computed、不需要 setter、也不会有循环。
 *
 * 转换只此一处；两个调用方（web 草稿工作台的自动保存、admin 编辑页的整份提交）都只绑一个区块对象。
 */
const model = defineModel<ResumeCustomSectionNode>({ required: true })

const draft = ref<ResumeCustomSectionDraft>(toCustomSectionDraft(model.value))

/** 契约区块 → 本地草稿：外部替换（例如保存后服务端回写）时要跟上 */
watch(
  () => model.value,
  next => {
    draft.value = toCustomSectionDraft(next)
  },
)

/** 本地草稿 → 契约区块：唯一的写出口。用 JSON 比对防止同一份内容反复 emit */
watch(
  draft,
  value => {
    const next = fromCustomSectionDraft(value, {
      id: model.value.id,
      icon: model.value.icon,
    }) as ResumeCustomSectionNode
    // ⚠️ 收窄是必须的：`fromCustomSectionDraft` 的返回类型是宽泛的 `ResumeSection`
    //    （它按 view 分叉，类型标注没跟着判别联合收窄），而这里由调用方保证是 custom 区块。
    if (JSON.stringify(next) === JSON.stringify(model.value)) return
    model.value = next
  },
  { deep: true },
)
</script>

<template>
  <CustomSectionEditor v-model="draft" />
</template>
