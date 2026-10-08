<script setup lang="ts">
import type { ResumeHeroProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'
import ResumeHeroAvatar from './parts/ResumeHeroAvatar.vue'
import ResumeHeroInfo from './parts/ResumeHeroInfo.vue'
import ResumeHeroInterestWall from './parts/ResumeHeroInterestWall.vue'
import ResumeHeroIntro from './parts/ResumeHeroIntro.vue'
import ResumeHeroLinks from './parts/ResumeHeroLinks.vue'
import ResumeHeroSnapshots from './parts/ResumeHeroSnapshots.vue'

/**
 * hero · 精致（pro）—— **展示形式的维度转换**，不是"堆装饰"。
 *
 * 本文件现在只做**组装**：零件在 `hero/parts/`，数据与业务逻辑在 composables
 * （`useHero` 数据视图、`useHeroTyping` 打字机、`useHeroKeys` 琴键音效）。
 * 留下的只有这一档独有的两件东西：数字块与能力雷达 —— 它们都是"一个组件内的映射"级别
 * 的差异（§12.1 手段 ②），还不到拆零件的程度。
 *
 * 六类手法（与 standard 的差异）：
 * - **压缩 + tooltip + 琴键**：Info 压成键帽胶囊，hover 滚出被截断的值，点击复制并按音阶发声
 * - **折叠**：Intro 主张句 + 其余句；兴趣墙收起 → 展开成「图 + 标签」词云
 * - **逐字揭示**：Intro 主张句由左至右显形，停 5s 循环
 * - **三维动效**：头像翻牌 + 鼠标跟随光晕
 * - **图表联动**：能力雷达与图例 hover / focus 联动
 * - **排布维度**：链接做成竖排「风铃」挂卡（横 → 竖）；`gallery` 退为结尾照片条
 *
 * 硬约束：动效在 `prefers-reduced-motion: reduce` 下全部降级为静态；
 * 不引第三方动画 / 图表 / 音频库；排版按「窄栏也能读」设计（不用视口断点）。
 */
const props = defineProps<ResumeHeroProps>()
const { profile, slogans, stats } = useHero(props)
</script>

<template>
  <!-- 头像：翻牌 + 跟随光晕（零件复用，standard 也用它） -->
  <div class="pro-reveal" style="--i: 0">
    <ResumeHeroAvatar :content="content" :options="options" :variant="variant">
      <template #badge="{ availability: badgeText }">
        <span v-if="badgeText" class="pro-availability">
          <span class="pro-availability-dot" aria-hidden="true" />
          {{ badgeText }}
        </span>
      </template>
    </ResumeHeroAvatar>
  </div>

  <!-- 姓名 / 定位 -->
  <div class="pro-reveal mt-4 space-y-1" style="--i: 1">
    <h1 class="resume-text text-2xl font-semibold tracking-tight">
      {{ profile.name }}
    </h1>
    <p class="resume-accent text-sm font-medium">
      {{ profile.headline }}
    </p>
  </div>

  <!-- 数字块：hover 时该行强调 -->
  <dl v-if="stats.length" class="resume-pro-stats pro-reveal" style="--i: 2">
    <div v-for="stat in stats" :key="stat.label" class="resume-pro-stat pro-stat-hover">
      <dt class="resume-pro-stat-label">{{ stat.label }}</dt>
      <dd class="resume-pro-stat-value">{{ stat.value }}</dd>
      <p v-if="stat.hint" class="resume-pro-stat-hint">{{ stat.hint }}</p>
    </div>
  </dl>

  <!-- 标语：hover 时渐变流动 -->
  <p
    v-for="line in slogans"
    :key="line"
    class="gradient-copy pro-reveal mt-3 text-sm font-semibold leading-6"
    style="--i: 3"
  >
    {{ line }}
  </p>

  <!-- Intro：主张句（打字机）+ 其余句（实测溢出才折叠） -->
  <div class="pro-reveal" style="--i: 4">
    <ResumeHeroIntro :content="content" :options="options" :variant="variant" />
  </div>

  <div class="pro-reveal" style="--i: 5">
    <ResumeHeroInfo :content="content" :options="options" :variant="variant" />
  </div>

  <div class="pro-reveal" style="--i: 6">
    <ResumeHeroLinks :content="content" :options="options" :variant="variant" />
  </div>

  <div class="pro-reveal" style="--i: 7">
    <ResumeHeroInterestWall :content="content" :options="options" :variant="variant" />
  </div>

  <div class="pro-reveal" style="--i: 8">
    <ResumeHeroSnapshots :content="content" :options="options" :variant="variant" />
  </div>
</template>

<style scoped>
/* 说明：本档独有的样式（数字块 / 雷达 / 徽标）留在这里；
 * 跨区块复用的零件样式在 app/assets/css/resume.css；零件自己的样式在各自 scoped。 */

/* ── 求职状态：脉动点 ───────────────────────────────── */
.pro-availability {
  position: absolute;
  right: -0.25rem;
  bottom: -0.4rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 9999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: #fff;
  background: var(--resume-primary);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--resume-primary) 35%, transparent);
}

.pro-availability-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 9999px;
  background: currentColor;
  animation: pro-pulse 2.4s ease-in-out infinite;
}

@keyframes pro-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.72);
  }
}

/* ── 数字块：hover 强调该行 ─────────────────────────── */
.pro-stat-hover {
  transition: transform 0.2s ease;
}

@media (hover: hover) {
  .pro-stat-hover:hover {
    transform: translateX(2px);
  }

  .pro-stat-hover:hover .resume-pro-stat-value {
    color: color-mix(in srgb, var(--resume-primary) 80%, #000);
  }
}

/* ── 标语：hover 时渐变流动 ─────────────────────────── */
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

/* ── 入场 stagger（CSS animation，无库）─────────────── */
.pro-reveal {
  animation: pro-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 70ms);
}

@keyframes pro-reveal {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── 降级：prefers-reduced-motion 下全部静态 ─────────── */
@media (prefers-reduced-motion: reduce) {
  .pro-stat-hover,
  .gradient-copy {
    transition: none;
  }

  .pro-availability-dot,
  .pro-reveal {
    animation: none;
  }

  @media (hover: hover) {
    .pro-stat-hover:hover {
      transform: none;
    }
  }
}
</style>
