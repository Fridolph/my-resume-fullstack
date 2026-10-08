<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'

/**
 * hero · 照片条零件（pro）。
 *
 * `gallery` 在这里归位：它不再是"主视觉"（那是头像的职责），而是卡片末尾的照片墙。
 * 语义分开之后，编辑者填「头像」和填「照片」是两件事，不会再互相覆盖。
 *
 * ≥ 2 张才显示：1 张与头像重复，没有展示价值。横向可滚，最多取 6 张。
 *
 * 样式全部写在标签上：`@media (hover: hover)` 用 `hover:` 变体、
 * `prefers-reduced-motion` 用 `motion-reduce:`（含 `motion-reduce:hover:` 取消位移），
 * 所以本文件**没有 style 块**。
 */
const props = defineProps<ResumeSectionBodyProps>()
const { profile, gallery } = useHero(props)

const MAX_SHOTS = 6
</script>

<template>
  <section v-if="gallery.length >= 2" class="mt-4 grid gap-2">
    <span class="resume-eyebrow">Snapshots</span>
    <div class="flex gap-[0.4rem] overflow-x-auto pb-[0.15rem]">
      <figure
        v-for="(shot, index) in gallery.slice(0, MAX_SHOTS)"
        :key="`${shot.url}-${index}`"
        class="h-12 w-18 shrink-0 overflow-hidden rounded-[0.5rem] border border-[var(--resume-border)] transition-[transform,border-color] duration-[250ms] ease-[ease] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--resume-primary)_45%,transparent)] motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
      >
        <img
          :src="shot.url"
          :alt="shot.alt || `${profile.name} 的照片`"
          loading="lazy"
          class="h-full w-full object-cover"
        />
      </figure>
    </div>
  </section>
</template>
