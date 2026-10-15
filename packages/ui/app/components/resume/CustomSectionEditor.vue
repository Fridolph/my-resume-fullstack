<script setup lang="ts">
import type { ResumeCustomSectionDraft, ResumeCustomView } from '@rs/common'

/**
 * 自定义模块的编辑器（标题 / 描述 / 展示方式 / 内容）。
 *
 * 与其它区块不同，这块内容**没有固定字段表**，所以不走 `MySchemaForm`，而是按 `view` 分派：
 * - `richText` — Nuxt UI 的 `UEditor`（TipTap）；存的是 **JSON**（不存 HTML，见契约说明）
 * - `textList` / `tagCloud` — 一个多行输入框，一行一条（两种的差别只在渲染，输入体验一样）
 * - `timeline` — 结构化条目（时间 / 标题 / 说明），可增删
 *
 * ⚠️ 它只编辑**草稿形状**（`ResumeCustomSectionDraft`：纯字符串、无 id），
 * 与契约的往返由 `@rs/common` 的 `toCustomSectionDraft` / `fromCustomSectionDraft` 负责 ——
 * 这样编辑器不必理解 id 生成与日期模式，也不会与另一端的实现漂移。
 *
 * 这里**不认任何 API、不管保存**：拿到什么就编辑什么，改完由宿主决定怎么落盘（web 是自动保存草稿，
 * admin 是提交表单）。这正是 `packages/ui` 的定位 —— 只描述"能做什么"，不判断"谁可以做"。
 */
const draft = defineModel<ResumeCustomSectionDraft>({ required: true })

const VIEW_OPTIONS: { value: ResumeCustomView; label: string; description: string }[] = [
  { value: 'richText', label: '富文本', description: '可以加粗、列表、链接的正文' },
  { value: 'textList', label: '条目列表', description: '一行一条，带强调点' },
  { value: 'tagCloud', label: '标签簇', description: '一行一个标签' },
  { value: 'timeline', label: '时间轴', description: '每项含时间、标题与说明' },
]

/** textList / tagCloud 共用一个多行输入：一行一条 */
const itemsText = computed({
  get: () => draft.value.items.join('\n'),
  set: (value: string) => {
    draft.value.items = value.split('\n')
  },
})

function addTimelineItem() {
  draft.value.timeline.push({ time: '', title: '', description: '' })
}

function removeTimelineItem(index: number) {
  draft.value.timeline.splice(index, 1)
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="模块标题" required hint="会作为区块标题显示">
      <UInput v-model="draft.title" placeholder="例如：获奖经历 / 开源贡献" class="w-full" />
    </UFormField>

    <UFormField label="描述" hint="可选，显示在标题下方">
      <UInput v-model="draft.description" placeholder="一句话说明这个模块" class="w-full" />
    </UFormField>

    <UFormField label="展示方式">
      <USelect v-model="draft.view" :items="VIEW_OPTIONS" value-key="value" class="w-full" />
    </UFormField>

    <!-- 富文本：TipTap JSON。
         ⚠️ 必须包 `ClientOnly`：`UEditor` 建立在 TipTap 上，初始化要读 DOM；
         服务端渲染阶段挂载会失败，表现就是"富文本区域一片空白、点不动"。 -->
    <UFormField v-if="draft.view === 'richText'" label="内容" hint="支持加粗、列表、链接等">
      <ClientOnly>
        <UEditor
          :model-value="draft.document"
          content-type="json"
          placeholder="写点什么…"
          class="w-full"
          @update:model-value="
            value => {
              draft.document = value as ResumeCustomSectionDraft['document']
            }
          "
        />
        <template #fallback>
          <div class="rounded-lg border border-default p-4 text-sm text-muted">编辑器加载中…</div>
        </template>
      </ClientOnly>
    </UFormField>

    <!-- 时间轴：结构化条目 -->
    <UFormField v-else-if="draft.view === 'timeline'" label="时间轴条目">
      <div class="space-y-2">
        <div
          v-for="(item, index) in draft.timeline"
          :key="index"
          class="grid gap-2 rounded-lg border border-default p-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto]"
        >
          <UInput v-model="item.time" size="sm" placeholder="2024" aria-label="时间" />
          <div class="grid gap-2">
            <UInput v-model="item.title" size="sm" placeholder="做了什么" aria-label="标题" />
            <UInput v-model="item.description" size="sm" placeholder="补充说明（可选）" aria-label="说明" />
          </div>
          <UButton
            icon="i-lucide-trash-2"
            size="sm"
            color="error"
            variant="ghost"
            aria-label="删除这一项"
            @click="removeTimelineItem(index)"
          />
        </div>

        <UButton icon="i-lucide-plus" size="sm" variant="soft" label="添加一项" @click="addTimelineItem" />
      </div>
    </UFormField>

    <!-- 条目列表 / 标签簇：一行一条 -->
    <UFormField v-else label="内容" :hint="draft.view === 'tagCloud' ? '一行一个标签' : '一行一条，空行会被忽略'">
      <UTextarea v-model="itemsText" :rows="6" placeholder="第一行&#10;第二行" class="w-full" />
    </UFormField>
  </div>
</template>
