<script setup lang="ts">
import type { ResumeProfileLink, ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'

/**
 * hero · 链接零件（pro 的「风铃」）。
 *
 * 为什么竖排小卡而不是 chip：横排 chip 与 Info 的胶囊、兴趣的标签都是同一种形状，
 * 区块之间区分不开；竖排 + 挂杆把这一块变成**空间维度**上的另一种排布（横 → 竖）。
 *
 * 挂的方式（2026-10-08 Owner 补充）：
 * - **一根横杆**（略粗、两端渐隐），卡片像风铃一样挂在杆下 —— 每个有一根自己的挂绳
 * - **不规则**：挂绳长短与卡片倾角按固定序列交错（**不用随机** —— 随机会让 SSR 与客户端
 *   算出不同结果、破坏水合一致性），于是卡片高低错落
 * - **一排最多 8 个**（4~6 个是最佳观感），超出另起一根杆
 * - 分布用 `space-around`（每张卡左右等距），再给每张一个**小的水平偏移**打破"精确均分"的呆板感；
 *   两个时也不会被推到最左最右（那是 `space-between` 的观感）
 */
const props = defineProps<ResumeSectionBodyProps>()
const { links } = useHero(props)

const MAX_PER_ROW = 8

/** 每 8 个一行，每行一根杆 */
const linkRows = computed(() => {
  const rows: ResumeProfileLink[][] = []

  for (let index = 0; index < links.value.length; index += MAX_PER_ROW) {
    rows.push(links.value.slice(index, index + MAX_PER_ROW))
  }

  return rows
})

/**
 * 挂绳长短（px）/ 卡片倾角（deg）/ 水平偏移（px）的错位序列。
 *
 * 三组都用固定序列而不是随机：随机会让 SSR 与客户端算出不同结果、破坏水合一致性。
 * `row * 3 + index` 让相邻两行也不会重复同一花纹。
 *
 * 偏移（`DRIFT_PATTERN`）是给 `space-around` 的"反呆板"用的 —— 间距仍大体均匀，
 * 但每张卡左右挪几像素，看起来像自然挂上去的。
 */
const HANG_PATTERN = [14, 23, 11, 26, 17, 21, 13, 24]
const TILT_PATTERN = [1.2, -1.6, 0.8, -1.1, 1.5, -0.9, 1.3, -1.4]
const DRIFT_PATTERN = [0, 3, -2, 5, -4, 2, -3, 4]

function hangOf(row: number, index: number) {
  return `${HANG_PATTERN[(row * 3 + index) % HANG_PATTERN.length]}px`
}

function tiltOf(row: number, index: number) {
  return `${TILT_PATTERN[(row * 3 + index) % TILT_PATTERN.length]}deg`
}

function driftOf(row: number, index: number) {
  return `${DRIFT_PATTERN[(row * 3 + index) % DRIFT_PATTERN.length]}px`
}
</script>

<template>
  <section v-if="links.length" class="mt-4 grid gap-[0.4rem]">
    <span class="resume-eyebrow">Links</span>

    <div v-for="(row, rowIndex) in linkRows" :key="rowIndex" class="relative pt-2">
      <span
        class="absolute inset-x-0 top-[0.1rem] h-[3px] rounded-full [background:linear-gradient(90deg,transparent,color-mix(in_srgb,var(--resume-border)_70%,var(--resume-primary))_12%,color-mix(in_srgb,var(--resume-border)_70%,var(--resume-primary))_88%,transparent)]"
        aria-hidden="true"
      />

      <div class="flex items-start justify-around gap-2">
        <a
          v-for="(link, index) in row"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noreferrer"
          class="hero-links-item group relative inline-flex origin-top flex-col items-center pt-[var(--hang,18px)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--resume-primary)] motion-reduce:transition-none"
          :style="`--hang: ${hangOf(rowIndex, index)}; --tilt: ${tiltOf(rowIndex, index)}; --drift: ${driftOf(rowIndex, index)}`"
        >
          <span
            class="absolute top-0 left-1/2 h-[var(--hang,18px)] w-px bg-[color-mix(in_srgb,var(--resume-border)_90%,transparent)]"
            aria-hidden="true"
          />
          <span
            class="inline-flex flex-col items-center gap-[0.3rem] rounded-[0.5rem] border border-[var(--resume-border)] bg-[color-mix(in_srgb,var(--resume-chip-bg)_55%,transparent)] px-[0.3rem] py-[0.45rem] [transform:translateX(var(--drift,0px))_rotate(var(--tilt,0deg))] transition-[border-color,box-shadow] duration-200 ease-[ease] group-hover:border-[color-mix(in_srgb,var(--resume-primary)_50%,transparent)] group-hover:shadow-[0_10px_20px_color-mix(in_srgb,var(--resume-primary)_12%,transparent)] motion-reduce:transition-none"
          >
            <UIcon :name="link.icon || 'i-lucide-external-link'" class="size-[0.9rem] resume-accent" />
            <span
              class="[writing-mode:vertical-rl] [text-orientation:mixed] text-[0.75rem] leading-none font-semibold tracking-[0.08em] resume-text"
              >{{ link.label }}</span
            >
          </span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
 * 只留「风铃摆动」这一处：`@keyframes` 与它的两个触发条件（hover / focus-visible）。
 * 其余（挂杆 / 挂绳 / 卡片 / 竖排文字 / hover 联动 / 焦点轮廓）全写在标签上 ——
 * 卡片的 hover 用 `group-hover:`（父 `<a>` 标 `group`），子元素本身没有 hover 冲突，安全。
 */
.hero-links-item:focus-visible {
  animation: hero-links-swing 0.9s ease-in-out;
}

@media (hover: hover) {
  .hero-links-item:hover {
    animation: hero-links-swing 0.9s ease-in-out;
  }
}

@keyframes hero-links-swing {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(3.2deg);
  }
  55% {
    transform: rotate(-2deg);
  }
  80% {
    transform: rotate(1deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-links-item {
    transition: none;
    animation: none;
  }
}
</style>
