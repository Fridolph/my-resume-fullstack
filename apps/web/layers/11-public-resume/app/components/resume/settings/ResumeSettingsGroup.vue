<script setup lang="ts">
/**
 * 设置项分组：统一「小标题 + 内容」的排版，同时承担**权限的"看看得到但改不动"档**。
 *
 * `locked`（有 view 无 edit）= 整组**展示但不可操作**：包一层 `<fieldset disabled>`，
 * 一次禁用内部所有表单控件 —— 比逐个给子组件加 `disabled` 可靠（不会漏），
 * 也与三档语义对齐（见 `docs/dev/identity-and-access.md` §2）：
 *
 * | 持有              | 表现                              |
 * | ----------------- | --------------------------------- |
 * | 无 `view`         | 整块不出现（由调用方的 `v-if` 决定） |
 * | 有 `view` 无 `edit` | **本组件**渲染，但控件 disabled    |
 * | `view` + `edit`   | 正常可操作                        |
 */
withDefaults(
  defineProps<{
    title: string
    /** 标题右侧的补充说明（可选，例如"仅左右 / 三栏布局生效"） */
    hint?: string
    /** 无 edit 权限：展示但不可操作 */
    locked?: boolean
    /** 锁定时显示的说明 */
    lockedHint?: string
  }>(),
  { hint: '', locked: false, lockedHint: '需要管理员权限' },
)
</script>

<template>
  <section class="settings-group">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <p class="resume-label font-semibold">{{ title }}</p>
      <span v-if="hint" class="resume-muted text-xs">{{ hint }}</span>
      <span v-if="locked" class="resume-muted inline-flex items-center gap-1 text-xs">
        <UIcon name="i-lucide-lock" class="size-3" />
        {{ lockedHint }}
      </span>
    </div>

    <fieldset class="settings-group-body" :disabled="locked">
      <slot />
    </fieldset>
  </section>
</template>

<style scoped>
.settings-group {
  display: grid;
  gap: 0.5rem;
}

/* fieldset 默认带边框与内边距，这里只借它的 disabled 语义 */
.settings-group-body {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;
}

.settings-group-body[disabled] {
  opacity: 0.6;
}
</style>
