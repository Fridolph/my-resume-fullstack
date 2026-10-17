<script setup lang="ts">
import ResumeAccountMenu from './ResumeAccountMenu.vue'

/**
 * 公开简历页的页头。
 *
 * ## 为什么访客页也要有页头
 *
 * 首页（`/`）是访客进入这个站的第一屏。只有正文会让人"不知道怎么登录、不知道还能做什么" ——
 * Owner 明确要求保留三样：
 * - **品牌 + 简历名**：告诉访客这是谁的简历（用文档里的品牌信息，不是通用标题）；
 * - **展示设置入口**：有 `Resume.Display:view` 权限的人（作者 / 管理员）可以打开展示配置；
 * - **AI 对话入口**：有 `AiTalk.Chat:view` 权限的人可以进 `/ai-talk`；
 * - **身份区**（`ResumeAccountMenu`）：未登录 = 登录入口；已登录 = 用户名菜单（含"我的简历"）。
 *
 * ⚠️ 权限决定入口**是否有**，而不是渲染成灰的 —— 与 `docs/dev/02_身份与权限_设计.md` §4 一致。
 * 所以访客（无权限）看到的是干净的公开页：只有品牌 + 登录。
 */
const props = withDefaults(
  defineProps<{
    brand?: string
    /** 编辑模式开关（只有能编辑的人才会看到这个菜单项） */
    editMode?: boolean
    /** 保存状态文案（就地编辑时显示"保存中… / 已保存"） */
    saveLabel?: string
  }>(),
  { brand: '简历', editMode: false, saveLabel: '' },
)

const emit = defineEmits<{ display: []; 'update:editMode': [value: boolean]; reset: [] }>()

const { canViewDisplay, canUseAiChat } = usePermission()

/** 品牌名过长时的首字标记（与简历 hero 的头像回退同一套思路） */
const initial = computed(() => props.brand.trim().slice(0, 1).toUpperCase() || '简')
</script>

<template>
  <header
    class="sticky top-0 z-20 border-b border-default bg-default/80 backdrop-blur-md supports-[backdrop-filter]:bg-default/60"
  >
    <div class="content-max flex items-center gap-3 px-4 py-3 sm:px-6">
      <!-- 品牌：配色跟随简历主题（变量由 `ResumePublicShell` 注入到 body） -->
      <span
        class="grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white"
        :style="{ background: 'linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))' }"
        aria-hidden="true"
      >
        {{ initial }}
      </span>
      <h1 class="truncate text-sm font-semibold text-highlighted">{{ brand }}</h1>

      <div class="ml-auto flex items-center gap-2">
        <!-- 展示设置：只有看得到展示配置的人才出现（访客不渲染） -->
        <UButton
          v-if="canViewDisplay"
          icon="i-lucide-sliders-horizontal"
          size="xs"
          color="neutral"
          variant="outline"
          aria-label="展示设置"
          @click="emit('display')"
        />

        <!-- AI 对话：有权限才出现；功能未上线前先给可见入口 -->
        <UButton
          v-if="canUseAiChat"
          to="/ai-talk"
          icon="i-lucide-sparkles"
          size="xs"
          color="neutral"
          variant="outline"
          aria-label="AI 对话"
        />

        <!-- 身份区：未登录是登录入口，已登录是用户名菜单（内含"我的简历"） -->
        <ResumeAccountMenu
          :save-label="saveLabel"
          :edit-mode="editMode"
          @update:edit-mode="emit('update:editMode', $event)"
          @reset="emit('reset')"
        />
      </div>
    </div>
  </header>
</template>
