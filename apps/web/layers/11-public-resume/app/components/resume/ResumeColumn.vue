<script setup lang="ts">
import type {
  ResumeContent,
  ResumeDisplayOptions,
  ResumeSectionKey,
  ResumeSlotKey,
  ResumeStyleId,
  ResumeThemeConfig,
} from "#layers/public-resume/app/types/resume";
import {
  getSectionDefinition,
  resumeSectionComponents,
} from "#layers/public-resume/app/config/resume-sections";

/**
 * 单栏：渲染某个栏位里的有序区块列表。
 *
 * 它只认识「注册表 + 契约」，不认识任何具体区块 —— 加区块不用改这里。
 * 编辑态的拖拽手柄、上移/下移、隐藏按钮都在这层注入：**区块组件本身不感知编辑**，
 * 因此同一份区块组件既能给公开站渲染，也能给 admin 复用。
 * `variant`（风格）本层不判断、只透传 —— 「长什么样」由区块组件自己决定。
 *
 * 空栏在编辑态下也要渲染落点（虚线占位），否则「把一栏清空后就拖不回去」。
 */
defineProps<{
  slotKey: ResumeSlotKey;
  keys: ResumeSectionKey[];
  content: ResumeContent;
  options: ResumeDisplayOptions;
  theme: ResumeThemeConfig;
  /** 风格变体：原样透传给区块组件 */
  variant: ResumeStyleId;
  editable?: boolean;
}>();

const emit = defineEmits<{
  hide: [key: ResumeSectionKey];
  edit: [key: ResumeSectionKey];
  /** 栏内上移 / 下移（delta = -1 / +1）：键盘与触屏的拖拽替代入口 */
  move: [key: ResumeSectionKey, delta: number];
}>();

function labelOf(key: ResumeSectionKey) {
  return getSectionDefinition(key)?.label ?? key;
}
</script>

<template>
  <div class="resume-drop-zone grid gap-6" :data-slot="slotKey">
    <div v-for="(key, index) in keys" :key="key" class="relative" :data-section-key="key">
      <div v-if="editable" class="absolute end-2 top-2 z-10 flex items-center gap-1">
        <button
          type="button"
          class="resume-tool-btn"
          :disabled="index === 0"
          :title="`上移「${labelOf(key)}」`"
          @click="emit('move', key, -1)"
        >
          <UIcon name="i-lucide-arrow-up" class="size-4" />
          <span class="sr-only">上移</span>
        </button>
        <button
          type="button"
          class="resume-tool-btn"
          :disabled="index === keys.length - 1"
          :title="`下移「${labelOf(key)}」`"
          @click="emit('move', key, 1)"
        >
          <UIcon name="i-lucide-arrow-down" class="size-4" />
          <span class="sr-only">下移</span>
        </button>
        <button
          type="button"
          class="resume-tool-btn"
          :title="`编辑「${labelOf(key)}」内容`"
          @click="emit('edit', key)"
        >
          <UIcon name="i-lucide-pencil" class="size-4" />
          <span class="sr-only">编辑内容</span>
        </button>
        <button
          type="button"
          data-drag-handle
          class="resume-tool-btn"
          :title="`拖拽调整「${labelOf(key)}」的位置或栏位`"
        >
          <UIcon name="i-lucide-grip-vertical" class="size-4" />
          <span class="sr-only">拖拽</span>
        </button>
        <button
          type="button"
          class="resume-tool-btn"
          :title="`隐藏「${labelOf(key)}」（移入未使用模块）`"
          @click="emit('hide', key)"
        >
          <UIcon name="i-lucide-eye-off" class="size-4" />
          <span class="sr-only">隐藏</span>
        </button>
      </div>

      <component
        :is="resumeSectionComponents[key]"
        :section="getSectionDefinition(key)!"
        :content="content"
        :options="options"
        :theme="theme"
        :variant="variant"
      />
    </div>

    <!-- 空栏：编辑态下留一个可落区域 -->
    <p v-if="editable && !keys.length" class="resume-empty-slot">拖到此处</p>
  </div>
</template>
