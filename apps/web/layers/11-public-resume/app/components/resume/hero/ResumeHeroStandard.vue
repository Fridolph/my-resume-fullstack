<script setup lang="ts">
import type { ResumeHeroProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'
import ResumeHeroAvatar from './parts/ResumeHeroAvatar.vue'
import ResumeHeroInfo from './parts/ResumeHeroInfo.vue'
import ResumeHeroInterestWall from './parts/ResumeHeroInterestWall.vue'

/**
 * hero · 标准：向旧站对齐 —— 翻牌头像、标语渐变文字、INTRO 卡、条目式 Info、链接与兴趣标签。
 *
 * 零件与 pro 共用：头像（`ResumeHeroAvatar`）、信息块（`ResumeHeroInfo`）、
 * 兴趣墙（`ResumeHeroInterestWall`）—— 复用的是**数据与行为**，各档的形态差异由零件内部按 `variant` 分。
 *
 * ⚠️ 翻牌只是视觉：旧站那头像是指向 `/ai-talk` 的 AI 对话入口，属 `12-ai-talk` 域，
 * 本仓不接跳转（feature layer 之间不得互相 import）。
 */
const props = defineProps<ResumeHeroProps>()
const { profile, slogans, links } = useHero(props)
</script>

<template>
  <div class="flex flex-col items-center gap-4 text-center">
    <ResumeHeroAvatar :content="content" :options="options" :variant="variant">
      <!-- 纯装饰徽标：旧站此处是 AI 对话入口，本仓不接跳转 -->
      <template #badge>
        <span aria-hidden="true" class="flip-badge">talk with me ...</span>
      </template>
    </ResumeHeroAvatar>

    <p v-for="line in slogans" :key="line" class="gradient-copy max-w-full text-sm font-semibold leading-6">
      {{ line }}
    </p>

    <div class="space-y-1">
      <h1 class="resume-text text-2xl font-semibold tracking-tight">
        {{ profile.name }}
      </h1>
      <p class="resume-muted text-sm font-semibold">
        {{ profile.headline }}
      </p>
    </div>

    <p
      class="w-full rounded-lg border p-4 text-start text-sm leading-6"
      :style="{ borderColor: 'var(--resume-border)', color: 'var(--resume-text)' }"
    >
      <span class="resume-eyebrow">Intro</span>
      {{ profile.summary }}
    </p>
  </div>

  <!-- Info：条目卡（图标 + 完整值） -->
  <ResumeHeroInfo :content="content" :options="options" :variant="variant" />

  <!-- 个人链接 -->
  <div v-if="links.length" class="mt-4 grid gap-2">
    <span class="resume-eyebrow">Links</span>
    <div class="resume-btn-group">
      <a
        v-for="link in links"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noreferrer"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-current"
        :style="{ borderColor: 'var(--resume-border)', color: 'var(--resume-text)' }"
      >
        <UIcon :name="link.icon || 'i-lucide-external-link'" class="resume-accent size-4" />
        {{ link.label }}
      </a>
    </div>
  </div>

  <!-- 兴趣：标签 + 说明（tooltip） -->
  <ResumeHeroInterestWall :content="content" :options="options" :variant="variant" />
</template>

<style scoped>
/* ── 头像上的装饰徽标（翻牌本体在 `parts/ResumeHeroAvatar.vue`）── */
.flip-badge {
  position: absolute;
  top: 0.1rem;
  right: -0.5rem;
  z-index: 1;
  border-radius: 9999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #fff;
  background: var(--resume-primary);
}

/* ── 标语渐变文字 ───────────────────────────────────── */
.gradient-copy {
  background-image: linear-gradient(
    120deg,
    var(--resume-text) 0%,
    var(--resume-primary) 38%,
    var(--resume-gradient-to) 68%,
    var(--resume-text) 100%
  );
  background-size: 220% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  transition: background-position 0.4s ease;
}

@media (hover: hover) {
  .gradient-copy:hover {
    background-position: 100% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gradient-copy {
    transition: none;
  }
}
</style>
