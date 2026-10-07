<script setup lang="ts">
import type { ResumeSectionProps } from '#layers/public-resume/app/types/resume'

/**
 * 基本信息卡片（左侧信息栏）。
 *
 * 风格差异（见 docs/dev/resume-styles.md §6）：
 * - `minimal`：缩略名方块 + 姓名 / 定位 / 概述 / 联系方式列表（原排版）
 * - `standard`：向旧站 hero 对齐 —— 头像**翻牌**、标语渐变文字、INTRO 卡、条目式联系方式、
 *   链接与兴趣标签；外层仍消费 `--resume-card-*`，底色与阴影由风格变量决定。
 *
 * ⚠️ 翻牌只是视觉：旧站那头像是指向 `/ai-talk` 的 AI 对话入口，属 `12-ai-talk` 域，
 * 本轮不接跳转（feature layer 之间不得互相 import）。
 */
const props = defineProps<ResumeSectionProps>()

const profile = computed(() => props.content.profile)
const isStandard = computed(() => props.variant === 'standard')

const avatarText = computed(
  () => profile.value.avatarText || profile.value.name.slice(0, 1),
)

/** 有正面图才走翻牌；否则回退文本块（编辑者不填图也不会塌） */
const hasAvatarImage = computed(() => Boolean(profile.value.hero.frontImageUrl))

/** 与旧站一致：最多展示 2 条标语 */
const slogans = computed(() => profile.value.hero.slogans.slice(0, 2))

const visibleContact = computed(() =>
  props.content.profile.contact.filter((item) => {
    if (item.key === 'phone') return props.options.showPhone
    if (item.key === 'email') return props.options.showEmail
    if (item.key === 'location') return props.options.showLocation
    if (item.key === 'years') return props.options.showYears
    return true
  }),
)
</script>

<template>
  <section
    class="r-hero border"
    :data-style="variant"
    :style="{
      background: 'var(--resume-card-bg)',
      borderColor: 'var(--resume-border)',
      borderRadius: 'var(--resume-card-radius)',
      padding: 'var(--resume-card-padding)',
      boxShadow: 'var(--resume-card-shadow)',
    }"
  >
    <!-- minimal：保持原排版 -->
    <template v-if="!isStandard">
      <div class="flex items-center gap-4">
        <span
          class="grid size-16 shrink-0 place-items-center rounded-2xl text-xl font-semibold text-white"
          :style="{
            background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))`,
          }"
        >
          {{ avatarText }}
        </span>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold tracking-tight" :style="{ color: 'var(--resume-text)' }">
            {{ profile.name }}
          </h1>
          <p class="mt-0.5 text-sm" :style="{ color: 'var(--resume-primary)' }">
            {{ profile.headline }}
          </p>
        </div>
      </div>

      <p class="mt-4 text-sm leading-6" :style="{ color: 'var(--resume-muted)' }">
        {{ profile.summary }}
      </p>

      <dl class="mt-4 space-y-2 border-t pt-4 text-sm" :style="{ borderColor: 'var(--resume-border)' }">
        <div v-for="item in visibleContact" :key="item.key" class="flex items-start gap-2">
          <UIcon :name="item.icon" class="mt-0.5 size-4 shrink-0" :style="{ color: 'var(--resume-primary)' }" />
          <dt class="sr-only">{{ item.label }}</dt>
          <dd class="min-w-0 break-all" :style="{ color: 'var(--resume-muted)' }">{{ item.value }}</dd>
        </div>
      </dl>
    </template>

    <!-- standard：对齐旧站 hero（翻牌只做视觉，不跳转） -->
    <template v-else>
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="flip relative">
          <span
            v-if="!hasAvatarImage"
            class="grid size-28 place-items-center rounded-full text-3xl font-semibold text-white"
            :style="{
              background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))`,
            }"
          >
            {{ avatarText }}
          </span>

          <div v-else class="flip-inner size-28">
            <div class="flip-face">
              <img
                :src="profile.hero.frontImageUrl"
                :alt="`${profile.name} 头像`"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="flip-face flip-face-back">
              <img
                :src="profile.hero.backImageUrl || profile.hero.frontImageUrl"
                :alt="`${profile.name} 头像（另一面）`"
                class="h-full w-full object-cover"
              />
            </div>
          </div>

          <!-- 纯装饰徽标：旧站此处是 AI 对话入口，本仓不接跳转 -->
          <span aria-hidden="true" class="flip-badge">talk with me ...</span>
        </div>

        <p
          v-for="line in slogans"
          :key="line"
          class="gradient-copy max-w-full text-sm font-semibold leading-6"
        >
          {{ line }}
        </p>

        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight" :style="{ color: 'var(--resume-text)' }">
            {{ profile.name }}
          </h1>
          <p class="text-sm font-semibold" :style="{ color: 'var(--resume-muted)' }">
            {{ profile.headline }}
          </p>
        </div>

        <p
          class="w-full rounded-2xl border p-4 text-start text-sm leading-6"
          :style="{ borderColor: 'var(--resume-border)', color: 'var(--resume-text)' }"
        >
          <span class="eyebrow">Intro</span>
          {{ profile.summary }}
        </p>
      </div>

      <!-- 联系方式：条目卡 -->
      <div class="mt-5 grid gap-2 rounded-2xl border p-4" :style="{ borderColor: 'var(--resume-border)' }">
        <span class="eyebrow">Contact</span>
        <div
          v-for="item in visibleContact"
          :key="item.key"
          class="contact-item flex items-start gap-3 rounded-xl border px-3 py-2"
          :style="{ borderColor: 'var(--resume-border)' }"
        >
          <UIcon :name="item.icon" class="mt-0.5 size-4 shrink-0" :style="{ color: 'var(--resume-primary)' }" />
          <span class="sr-only">{{ item.label }}</span>
          <span class="min-w-0 break-all text-sm" :style="{ color: 'var(--resume-muted)' }">{{ item.value }}</span>
        </div>
      </div>

      <!-- 个人链接 -->
      <div v-if="profile.links.length" class="mt-4 grid gap-2">
        <span class="eyebrow">Links</span>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="link in profile.links"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-current"
            :style="{ borderColor: 'var(--resume-border)', color: 'var(--resume-text)' }"
          >
            <UIcon :name="link.icon || 'i-lucide-external-link'" class="size-4" :style="{ color: 'var(--resume-primary)' }" />
            {{ link.label }}
          </a>
        </div>
      </div>

      <!-- 兴趣 -->
      <div v-if="profile.interests.length" class="mt-4 grid gap-2">
        <span class="eyebrow">Interests</span>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="interest in profile.interests"
            :key="interest.label"
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            :style="{ borderColor: 'var(--resume-border)', color: 'var(--resume-muted)' }"
          >
            <UIcon v-if="interest.icon" :name="interest.icon" class="size-4" :style="{ color: 'var(--resume-primary)' }" />
            {{ interest.label }}
          </span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.eyebrow {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--resume-muted);
}

.r-hero {
  transition:
    transform 0.2s ease,
    box-shadow 0.24s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .r-hero[data-style='standard']:hover {
    border-color: color-mix(in srgb, var(--resume-primary) 40%, transparent);
    box-shadow: var(--resume-card-shadow-hover);
  }
}

/* ── 头像翻牌（3D 无法用变量表达，回到 CSS）────────── */
.flip {
  perspective: 1000px;
}

.flip-inner {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.85s ease;
}

.flip-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--resume-primary) 35%, transparent);
  backface-visibility: hidden;
}

.flip-face-back {
  transform: rotateY(180deg);
}

@media (hover: hover) {
  .flip:hover .flip-inner {
    transform: rotateY(180deg);
  }
}

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

/* ── 联系条目卡：hover 提亮 ─────────────────────────── */
.contact-item {
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .contact-item:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--resume-primary) 45%, transparent);
    box-shadow: 0 12px 24px color-mix(in srgb, var(--resume-primary) 10%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .r-hero,
  .flip-inner,
  .gradient-copy,
  .contact-item {
    transition: none;
  }

  .flip:hover .flip-inner {
    transform: none;
  }
}
</style>
