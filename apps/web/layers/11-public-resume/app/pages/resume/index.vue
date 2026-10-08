<script setup lang="ts">
import ResumeLoginButton from "#layers/public-resume/app/components/resume/ResumeLoginButton.vue";
import ResumePageContainer from "#layers/public-resume/app/components/resume/ResumePageContainer.vue";
import ResumePageHeader from "#layers/public-resume/app/components/resume/ResumePageHeader.vue";
import ResumeSectionEditorDrawer from "#layers/public-resume/app/components/resume/ResumeSectionEditorDrawer.vue";
import ResumeSettingsDrawer from "#layers/public-resume/app/components/resume/ResumeSettingsDrawer.vue";
import { getSectionDefinition } from "#layers/public-resume/app/config/resume-sections";
import { useResumeActiveSection } from "#layers/public-resume/app/composables/useResumeActiveSection";
import { useResumeAdmin } from "#layers/public-resume/app/composables/useResumeAdmin";
import { useResumeContent } from "#layers/public-resume/app/composables/useResumeContent";
import { useResumeDisplay } from "#layers/public-resume/app/composables/useResumeDisplay";
import type { ResumeSectionKey, ResumeStyleId } from "#layers/public-resume/app/types/resume";

/**
 * 公开简历页 —— 只做编排。
 *
 * 头部（品牌 + 滚动模块名 + 操作）· 正文容器 · 两个抽屉（设置 / 内容编辑）。
 * 操作块本身都在组件里：登录入口自带弹窗，设置自带抽屉，页面只负责开关状态。
 *
 * 保存策略：布局配置与内容都是**自动保存**（编辑态下防抖落盘，见两个 composable），
 * 页面只显示"保存中 / 已自动保存 · 刚刚"，并保留一个「重置」。
 */
definePageMeta({
  title: "公开简历",
});

const {
  config,
  settingsOpen,
  editable,
  saveState: displaySaveState,
  savedAt: displaySavedAt,
  toggleSection,
  reset: resetDisplay,
  setEditable,
  loadLocal: loadDisplay,
} = useResumeDisplay();

const {
  content,
  saveState: contentSaveState,
  savedAt: contentSavedAt,
  loadLocal: loadContent,
  reset: resetContent,
} = useResumeContent();

const { isAdmin, restore } = useResumeAdmin();
const { activeKey } = useResumeActiveSection();

const editorOpen = ref(false);
const editingKey = ref<ResumeSectionKey | null>(null);

/** 品牌：优先用配置，未配置回退预设（姓名首字 / 姓名 / 定位） */
const brand = computed(() => ({
  ...config.value.brand,
  logoText:
    config.value.brand.logoText ||
    content.value.profile.avatarText ||
    content.value.profile.name.slice(0, 1),
  title: config.value.brand.title || content.value.profile.name,
  description: config.value.brand.description ?? content.value.profile.headline,
}));

/** 头部中区：滚动正文时显示当前模块名 */
const activeSectionTitle = computed(() =>
  activeKey.value ? (getSectionDefinition(activeKey.value)?.label ?? "") : "",
);

/**
 * 保存状态提示。
 *
 * `now` 只在客户端起步（SSR 期间保持 null），避免"刚刚 / 12 秒前"这类相对时间
 * 在服务端与客户端算出不同结果而水合不一致。
 */
const now = ref<number | null>(null);
let clock: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  now.value = Date.now();
  clock = setInterval(() => {
    now.value = Date.now();
  }, 15_000);
});

onBeforeUnmount(() => {
  if (clock) {
    clearInterval(clock);
  }
});

function relativeTime(at: number) {
  const seconds = Math.max(0, Math.round(((now.value ?? at) - at) / 1000));
  if (seconds < 5) {
    return "刚刚";
  }
  if (seconds < 60) {
    return `${seconds} 秒前`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  return new Date(at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

const saveLabel = computed(() => {
  if (displaySaveState.value === "pending" || contentSaveState.value === "pending") {
    return "保存中…";
  }

  const at = Math.max(displaySavedAt.value ?? 0, contentSavedAt.value ?? 0);
  if (!at || !now.value) {
    return "改动会自动保存";
  }

  return `已自动保存 · ${relativeTime(at)}`;
});

/**
 * 主题（颜色）+ 风格（外观参数）→ CSS 变量，注入到 `<body>`。
 *
 * 为什么不挂在内容容器上：设置抽屉与登录弹窗是 **teleport 到 body** 的，
 * 只挂在容器上的变量它们解析不到 —— 控件颜色与圆角就没法跟随简历主题。
 * 变量默认值集中在 `layers/11-public-resume/app/assets/css/resume.css`。
 */
/**
 * 三档「外观参数」（盒子层面）。
 *
 * 与主题（颜色）正交：这里只放圆角 / 内边距 / 字级 / 表面 / 阴影，颜色一律由 `--resume-*` 派生，
 * 所以任何「风格 × 主题（预设 × 明暗）」组合都不会互相污染。
 * 用映射表表达：**加一档风格 = 加一行**，不再堆 `standard ? … : …`。
 */
const CARD_STYLE: Record<
  ResumeStyleId,
  {
    radius: string;
    padding: string;
    titleSize: string;
    bg: string;
    shadow: string;
    shadowHover: string;
    uiRadius: string;
  }
> = {
  minimal: {
    radius: "1rem",
    padding: "1.25rem",
    titleSize: "0.875rem",
    bg: "var(--resume-surface)",
    shadow: "none",
    shadowHover: "none",
    uiRadius: "0.5rem",
  },
  standard: {
    radius: "1.5rem",
    padding: "1.5rem",
    titleSize: "1.5rem",
    bg: [
      "radial-gradient(circle at top left, color-mix(in srgb, var(--resume-primary) 10%, transparent), transparent 34%)",
      "radial-gradient(circle at bottom right, color-mix(in srgb, var(--resume-primary) 6%, transparent), transparent 28%)",
      "linear-gradient(180deg, color-mix(in srgb, var(--resume-surface) 88%, transparent), color-mix(in srgb, var(--resume-chip-bg) 60%, var(--resume-surface)))",
    ].join(", "),
    shadow: "0 16px 40px color-mix(in srgb, var(--resume-text) 7%, transparent)",
    shadowHover: "0 20px 44px color-mix(in srgb, var(--resume-primary) 18%, transparent)",
    uiRadius: "0.75rem",
  },
  // 精致：更圆的角、更柔的阴影、单一低调光斑 —— 靠层级与留白，而不是堆装饰
  pro: {
    radius: "1.75rem",
    padding: "1.5rem",
    titleSize: "1.25rem",
    bg: [
      "radial-gradient(circle at top right, color-mix(in srgb, var(--resume-primary) 9%, transparent), transparent 40%)",
      "linear-gradient(180deg, color-mix(in srgb, var(--resume-surface) 92%, transparent), color-mix(in srgb, var(--resume-chip-bg) 45%, var(--resume-surface)))",
    ].join(", "),
    shadow: "0 20px 50px color-mix(in srgb, var(--resume-text) 6%, transparent)",
    shadowHover: "0 24px 56px color-mix(in srgb, var(--resume-primary) 16%, transparent)",
    uiRadius: "0.875rem",
  },
};

const resumeVars = computed(() => {
  const { theme, style } = config.value;
  const card = CARD_STYLE[style.id]!;
  /** 当前明暗对应的那组色值 */
  const palette = theme[theme.mode];
  const isDark = theme.mode === "dark";

  return {
    // ── 主题（颜色）──
    "--resume-primary": palette.primary,
    "--resume-gradient-from": palette.gradientFrom,
    "--resume-gradient-to": palette.gradientTo,
    // 页面底色：旧站式渐变（颜色由 primary 派生，随主题变化）
    "--resume-page": [
      "radial-gradient(circle at top, color-mix(in srgb, var(--resume-primary) 14%, transparent), transparent 24%)",
      isDark
        ? "linear-gradient(180deg, #020617 0%, #0f172a 100%)"
        : "linear-gradient(180deg, color-mix(in srgb, var(--resume-primary) 3%, #f7f9fe) 0%, color-mix(in srgb, var(--resume-primary) 6%, #eef3fb) 100%)",
    ].join(", "),
    // 这些颜色取自「当前明暗那一组」（自定义主题可逐项编辑）
    "--resume-surface": palette.surface,
    "--resume-border": palette.border,
    "--resume-text": palette.text,
    "--resume-muted": palette.muted,
    "--resume-chip-bg": palette.chipBg,
    "--resume-chip-text": palette.chipText,

    // ── 风格（外观参数）──
    "--resume-card-radius": card.radius,
    "--resume-card-padding": card.padding,
    "--resume-title-size": card.titleSize,
    "--resume-card-bg": card.bg,
    "--resume-card-shadow": card.shadow,
    "--resume-card-shadow-hover": card.shadowHover,

    // ── 让 Nuxt UI 组件（抽屉 / 弹窗 / 按钮 / 徽标）跟随简历主题 ──
    "--ui-primary": "var(--resume-primary)",
    "--ui-radius": card.uiRadius,
  };
});

useHead({
  bodyAttrs: {
    style: computed(() =>
      Object.entries(resumeVars.value)
        .map(([key, value]) => `${key}:${value}`)
        .join(";"),
    ),
  },
});

// 登录态与已保存内容都在客户端恢复：SSR 不渲染编辑态，避免水合不一致
onMounted(() => {
  restore();
  loadDisplay();
  loadContent();
});

watch(isAdmin, (value) => setEditable(value), { immediate: true });

function openEditor(key: ResumeSectionKey) {
  editingKey.value = key;
  editorOpen.value = true;
}

function resetAll() {
  resetDisplay();
  resetContent();
}
</script>

<template>
  <div>
    <ResumePageHeader :brand="brand" :active-section-title="activeSectionTitle">
      <template #actions>
        <template v-if="isAdmin">
          <span class="resume-muted hidden text-xs sm:inline">{{ saveLabel }}</span>
          <UButton size="xs" color="neutral" variant="ghost" label="重置" @click="resetAll" />
        </template>

        <ResumeLoginButton />

        <UTooltip text="展示设置">
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-sliders-horizontal"
            aria-label="展示设置"
            @click="settingsOpen = true"
          />
        </UTooltip>
      </template>
    </ResumePageHeader>

    <ResumePageContainer
      :content="content"
      :config="config"
      :editable="editable"
      @hide="toggleSection"
      @edit="openEditor"
    />

    <ResumeSettingsDrawer v-model:open="settingsOpen" />
    <ResumeSectionEditorDrawer v-model:open="editorOpen" :section-key="editingKey" />
  </div>
</template>
