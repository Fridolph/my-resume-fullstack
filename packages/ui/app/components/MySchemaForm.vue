<script setup lang="ts">
import type { FormSegmentSchema } from '@rs/common'
import MyModal from './MyModal.vue'
import MySchemaFieldInput from './MySchemaFieldInput.vue'

/**
 * 通用字段表单（schema 驱动，支持多段）。
 *
 * 每段要么是 `fields`（按点号路径直接改根对象上的字段，如 `profile.hero.slogans`），
 * 要么是 `list`（编辑根对象上的某个数组，**路径同样支持点号**，如 `profile.links`）。
 *
 * 各端的字段表各自维护（web 在 `config/resume-editor-schemas.ts`，admin 在简历的创建 / 编辑页 config）；
 * 要加「一段」不用动这里。数组的定位在这里完成，所以调用方不需要知道 `listPath` 怎么写。
 *
 * ⚠️ **删除一条要二次确认**：字段表单里的"删除这一项"是一击即中的破坏性动作，
 * 而条目往往刚被填过、手滑概率高。所以这里的删除按钮只"请求删除"，真正删除要过本组件底部的
 * 确认弹窗（确认 + 防误点倒计时）—— 与列表页删整份简历是同一个道理。
 */
const props = defineProps<{
  /** 编辑的根对象（各端自己的内容对象） */
  root?: Record<string, unknown>
  segments: FormSegmentSchema[]
}>()

const emit = defineEmits<{ change: [] }>()

/** 防误点倒计时：删一条内容的破坏面比删整份简历小，2 秒足够挡住手滑，也不至于打断心流 */
const REMOVE_COOLDOWN_SECONDS = 2

/**
 * 就地改数组项的某个字段并标记改动。
 *
 * 模板里**不要**写多语句内联表达式（`x = $event; emit(...)`）——
 * oxfmt 会把它们折成多行，而 Vue 模板属性中的多语句表达式非法（构建期报
 * `Error parsing JavaScript expression`）。统一收敛成方法调用。
 */
function setItemValue(item: Record<string, unknown>, key: string, value: unknown) {
  item[key] = value
  emit('change')
}

function readPath(path: string, base?: unknown): unknown {
  const start = base ?? props.root

  return path.split('.').reduce<unknown>((acc, key) => {
    return acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined
  }, start)
}

function writePath(path: string, value: unknown) {
  const keys = path.split('.')
  const last = keys.pop() as string
  const target = keys.reduce<Record<string, unknown>>(
    (acc, key) => {
      return acc[key] as Record<string, unknown>
    },
    props.root as Record<string, unknown>,
  )

  target[last] = value
  emit('change')
}

/** 段内的数组（`list` 模式）：路径可含点号，如 `profile.links` */
function itemsOf(segment: FormSegmentSchema): Record<string, unknown>[] | undefined {
  if (!segment.listPath) {
    return undefined
  }

  return readPath(segment.listPath) as Record<string, unknown>[] | undefined
}

/** 条目标题：优先用 `titleKey` 指定的字段，没有就退化成"第 N 项" */
function itemTitle(segment: FormSegmentSchema, item: Record<string, unknown> | undefined, index: number): string {
  const fallback = `第 ${Number(index) + 1} 项`
  if (!segment.titleKey || !item) {
    return fallback
  }

  const title = String(item[segment.titleKey] ?? '').trim()
  return title === '' ? fallback : title
}

function addItem(segment: FormSegmentSchema) {
  itemsOf(segment)?.push(structuredClone(segment.blank ?? {}))
  emit('change')
}

/**
 * 真正的删除。只在确认弹窗里调用 —— 模板里的按钮走 `requestRemove`。
 */
function removeItem(segment: FormSegmentSchema, index: number) {
  itemsOf(segment)?.splice(index, 1)
  emit('change')
}

function moveItem(segment: FormSegmentSchema, index: number, delta: number) {
  const list = itemsOf(segment)
  const target = index + delta
  if (!list || target < 0 || target >= list.length) {
    return
  }

  const [item] = list.splice(index, 1)
  if (item) {
    list.splice(target, 0, item)
  }
  emit('change')
}

// ── 删除确认 ─────────────────────────────────────────────────────────
const removeOpen = ref(false)
const removeCooldown = ref(0)
const pendingRemove = ref<{ segment: FormSegmentSchema; index: number; title: string } | null>(null)
let cooldownTimer: ReturnType<typeof setInterval> | undefined

function stopCooldown() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = undefined
  }
}

/**
 * 计时器用纯 `setInterval` 实现（不用 `@vueuse/core` 的 `useCountdown`）：
 * `packages/ui` 是**零第三方运行时依赖**的共享层，为两行倒计时引一个依赖不划算。
 */
function startCooldown() {
  stopCooldown()
  removeCooldown.value = REMOVE_COOLDOWN_SECONDS
  cooldownTimer = setInterval(() => {
    removeCooldown.value -= 1
    if (removeCooldown.value <= 0) {
      stopCooldown()
    }
  }, 1000)
}

function requestRemove(segment: FormSegmentSchema, index: number) {
  const item = itemsOf(segment)?.[index]
  pendingRemove.value = { segment, index, title: itemTitle(segment, item, index) }
  removeOpen.value = true
  startCooldown()
}

/** 确认删除：执行移除并关闭弹窗（关闭会触发 `resetRemoveState` 收尾） */
function confirmRemove() {
  const pending = pendingRemove.value
  if (!pending) {
    return
  }

  removeItem(pending.segment, pending.index)
  removeOpen.value = false
}

/** 弹窗关闭（确认或取消都会走到）：清掉待删信息与计时器，避免下次打开时状态残留 */
function resetRemoveState() {
  pendingRemove.value = null
  stopCooldown()
}

onBeforeUnmount(stopCooldown)
</script>

<template>
  <div class="space-y-8">
    <section v-for="(segment, segmentIndex) in segments" :key="segmentIndex" class="space-y-4">
      <p v-if="segment.label" class="border-b border-default pb-2 text-sm font-semibold">
        {{ segment.label }}
      </p>

      <!-- fields：直接改字段 -->
      <div v-if="segment.mode === 'fields'" class="grid gap-4 sm:grid-cols-2">
        <UFormField
          v-for="field in segment.fields"
          :key="field.path"
          :label="field.label"
          :class="field.wide ? 'sm:col-span-2' : ''"
        >
          <MySchemaFieldInput
            :field="field"
            :value="readPath(field.path ?? '')"
            @update:value="writePath(field.path ?? '', $event)"
          />
        </UFormField>
      </div>

      <!-- list：增删 / 上下移动数组项 -->
      <template v-else>
        <UCard v-for="(item, index) in itemsOf(segment)" :key="index" :ui="{ body: 'space-y-4 p-4 sm:p-4' }">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-sm font-medium">{{ itemTitle(segment, item, index) }}</p>
            <div class="flex shrink-0 items-center gap-1">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-up"
                :disabled="index === 0"
                aria-label="上移"
                @click="moveItem(segment, index, -1)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-down"
                :disabled="index === (itemsOf(segment)?.length ?? 1) - 1"
                aria-label="下移"
                @click="moveItem(segment, index, 1)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="删除这一项"
                @click="requestRemove(segment, index)"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              v-for="field in segment.fields"
              :key="field.key"
              :label="field.label"
              :class="field.wide ? 'sm:col-span-2' : ''"
            >
              <MySchemaFieldInput
                :field="field"
                :value="item[field.key ?? '']"
                @update:value="setItemValue(item, field.key ?? '', $event)"
              />
            </UFormField>
          </div>

          <!--
            只读附加信息：给"这一项里有、但表单类型表达不了"的内容留个位置
            （例如契约里的结构化日期，或尚未支持编辑的嵌套字段）。页面自己决定渲染什么，
            这里不预设形状 —— 不传插槽就等于没有。
          -->
          <slot name="list-item-extra" :item="item" :index="index" />
        </UCard>

        <UButton size="sm" variant="outline" icon="i-lucide-plus" label="新增一项" @click="addItem(segment)" />
      </template>
    </section>

    <!--
      删除确认：整个表单共用一个弹窗（状态里记着"要删哪一段的第几项"）。
      `MyModal` 顺带把移动端处理好了 —— 窄屏自动退化成抽屉。
    -->
    <MyModal
      v-model:open="removeOpen"
      title="删除这一项？"
      :description="`「${pendingRemove?.title ?? ''}」会从这一段里移除。`"
      :dismissible="false"
      @close="resetRemoveState"
    >
      <p class="text-sm text-muted">这一步只影响当前编辑的内容，保存后才会写入；取消则原样保留。</p>

      <template #footer="{ cancel }">
        <div class="flex w-full items-center justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="取消" @click="cancel" />
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            :disabled="removeCooldown > 0"
            :label="removeCooldown > 0 ? `删除 (${removeCooldown})` : '删除'"
            @click="confirmRemove"
          />
        </div>
      </template>
    </MyModal>
  </div>
</template>
