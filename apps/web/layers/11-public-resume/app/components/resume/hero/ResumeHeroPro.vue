<script setup lang="ts">
import type { ResumeHeroProps } from '#layers/public-resume/app/types/resume'
import { useResumeProfileView } from '#layers/public-resume/app/composables/useResumeProfileView'

/**
 * hero · 精致：画廊 + 数字块 + 能力雷达 + 求职状态，版式更讲究。
 *
 * 本轮只做**排版**（动效分期：入场 stagger / 视差 / hover 特效留到下一期）。
 * 雷达用 SVG 手绘（三角函数算顶点），不引入图表库。
 * 排版按"窄栏也能读"设计：单列 / 两列为主，不用视口断点（栏宽 ≠ 视口宽）。
 */
const props = defineProps<ResumeHeroProps>()
const { profile, avatarText, slogans, visibleContact } = useResumeProfileView(props)

const gallery = computed(() => profile.value.gallery ?? [])
const stats = computed(() => profile.value.stats ?? [])
const availability = computed(() => profile.value.availability ?? '')

// ── 雷达几何 ────────────────────────────────────────────
const RADAR_SIZE = 120
const RADAR_CENTER = RADAR_SIZE / 2
const RADAR_RADIUS = RADAR_SIZE / 2 - 14

/** 至少 3 个维度才构成多边形，否则不画 */
const radarAxes = computed(() => {
  const items = profile.value.radar ?? []
  const count = items.length

  if (count < 3) {
    return []
  }

  const step = (Math.PI * 2) / count

  return items.map((item, index) => {
    const angle = step * index - Math.PI / 2
    const ratio = Math.max(0, Math.min(100, item.value)) / 100

    return {
      label: item.label,
      value: item.value,
      x: RADAR_CENTER + RADAR_RADIUS * Math.cos(angle),
      y: RADAR_CENTER + RADAR_RADIUS * Math.sin(angle),
      px: RADAR_CENTER + RADAR_RADIUS * ratio * Math.cos(angle),
      py: RADAR_CENTER + RADAR_RADIUS * ratio * Math.sin(angle),
    }
  })
})

/** 雷达底图：按比例缩放的闭合多边形 */
function gridPolygon(ratio: number) {
  const count = radarAxes.value.length
  if (!count) {
    return ''
  }

  const step = (Math.PI * 2) / count

  return Array.from({ length: count }, (_, index) => {
    const angle = step * index - Math.PI / 2
    const x = (RADAR_CENTER + RADAR_RADIUS * ratio * Math.cos(angle)).toFixed(1)
    const y = (RADAR_CENTER + RADAR_RADIUS * ratio * Math.sin(angle)).toFixed(1)

    return `${x},${y}`
  }).join(' ')
}

const radarArea = computed(() =>
  radarAxes.value.map((axis) => `${axis.px.toFixed(1)},${axis.py.toFixed(1)}`).join(' '),
)

const radarLabelText = computed(() =>
  radarAxes.value.map((axis) => `${axis.label} ${axis.value}`).join('，'),
)
</script>

<template>
  <!-- 画廊 + 求职状态徽标 -->
  <div class="relative">
    <div v-if="gallery.length" class="grid grid-cols-2 gap-2">
      <figure
        v-for="(shot, index) in gallery.slice(0, 4)"
        :key="`${shot.url}-${index}`"
        class="pro-shot"
        :class="index === 0 ? 'col-span-2 aspect-[5/3]' : 'aspect-square'"
      >
        <img
          :src="shot.url"
          :alt="shot.alt || `${profile.name} 的照片`"
          class="h-full w-full object-cover"
        />
      </figure>
    </div>

    <!-- 没填图也不塌：回退文本块（与另两档一致） -->
    <span
      v-else
      class="grid size-20 place-items-center rounded-2xl text-2xl font-semibold text-white"
      :style="{
        background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))`,
      }"
    >
      {{ avatarText }}
    </span>

    <span v-if="availability" class="pro-availability">
      <span class="pro-availability-dot" aria-hidden="true" />
      {{ availability }}
    </span>
  </div>

  <!-- 姓名 / 定位 -->
  <div class="mt-4 space-y-1">
    <h1 class="resume-text text-2xl font-semibold tracking-tight">
      {{ profile.name }}
    </h1>
    <p class="resume-accent text-sm font-medium">
      {{ profile.headline }}
    </p>
  </div>

  <!-- 数字块 -->
  <dl v-if="stats.length" class="resume-pro-stats">
    <div v-for="stat in stats" :key="stat.label" class="resume-pro-stat">
      <dt class="resume-pro-stat-label">{{ stat.label }}</dt>
      <dd class="resume-pro-stat-value">{{ stat.value }}</dd>
      <p v-if="stat.hint" class="resume-pro-stat-hint">{{ stat.hint }}</p>
    </div>
  </dl>

  <!-- 标语 -->
  <p
    v-for="line in slogans"
    :key="line"
    class="gradient-copy mt-3 text-sm font-semibold leading-6"
  >
    {{ line }}
  </p>

  <!-- INTRO -->
  <p class="pro-intro">
    <span class="resume-eyebrow">Intro</span>
    {{ profile.summary }}
  </p>

  <!-- 能力雷达 -->
  <section v-if="radarAxes.length" class="resume-pro-block">
    <span class="resume-eyebrow">Capability</span>
    <div class="flex items-center gap-3">
      <svg
        class="pro-radar"
        :viewBox="`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`"
        role="img"
        :aria-label="`能力雷达：${radarLabelText}`"
      >
        <polygon
          v-for="ratio in [0.25, 0.5, 0.75, 1]"
          :key="ratio"
          class="pro-radar-grid"
          :points="gridPolygon(ratio)"
        />
        <line
          v-for="axis in radarAxes"
          :key="`${axis.label}-axis`"
          class="pro-radar-axis"
          :x1="RADAR_CENTER"
          :y1="RADAR_CENTER"
          :x2="axis.x"
          :y2="axis.y"
        />
        <polygon class="pro-radar-area" :points="radarArea" />
        <circle
          v-for="axis in radarAxes"
          :key="`${axis.label}-dot`"
          class="pro-radar-dot"
          :cx="axis.px"
          :cy="axis.py"
          r="1.8"
        />
      </svg>

      <ul class="min-w-0 flex-1 space-y-1">
        <li
          v-for="axis in radarAxes"
          :key="axis.label"
          class="flex items-baseline justify-between gap-2"
        >
          <span class="resume-muted truncate text-xs">{{ axis.label }}</span>
          <span class="resume-text text-xs font-semibold tabular-nums">{{ axis.value }}</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- 联系方式 -->
  <section class="resume-pro-block">
    <span class="resume-eyebrow">Contact</span>
    <div class="grid gap-1.5">
      <div v-for="item in visibleContact" :key="item.key" class="resume-pro-row">
        <UIcon :name="item.icon" class="resume-accent size-4 shrink-0" />
        <span class="sr-only">{{ item.label }}</span>
        <span class="resume-muted min-w-0 break-all text-sm">{{ item.value }}</span>
      </div>
    </div>
  </section>

  <!-- 个人链接 -->
  <section v-if="profile.links.length" class="resume-pro-block">
    <span class="resume-eyebrow">Links</span>
    <div class="resume-btn-group">
      <a
        v-for="link in profile.links"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noreferrer"
        class="resume-pro-chip"
      >
        <UIcon :name="link.icon || 'i-lucide-external-link'" class="resume-accent size-4" />
        {{ link.label }}
      </a>
    </div>
  </section>

  <!-- 兴趣 -->
  <section v-if="profile.interests.length" class="resume-pro-block">
    <span class="resume-eyebrow">Interests</span>
    <div class="resume-btn-group">
      <span v-for="interest in profile.interests" :key="interest.label" class="resume-pro-chip">
        <UIcon v-if="interest.icon" :name="interest.icon" class="resume-accent size-4" />
        {{ interest.label }}
      </span>
    </div>
  </section>
</template>

<style scoped>
/* ── 画廊与求职状态：结构/装饰差异用原生 CSS + 变量表达 ── */
.pro-shot {
  overflow: hidden;
  border: 1px solid var(--resume-border);
  border-radius: calc(var(--resume-card-radius) * 0.6);
}

.pro-availability {
  position: absolute;
  right: -0.25rem;
  bottom: -0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 9999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  background: var(--resume-primary);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--resume-primary) 35%, transparent);
}

.pro-availability-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 9999px;
  background: currentColor;
}

/* ── 介绍卡 / 分块 / 条目 / 胶囊 ─────────────────────── */
.pro-intro {
  margin-top: 0.75rem;
  border: 1px solid var(--resume-border);
  border-radius: calc(var(--resume-card-radius) * 0.6);
  padding: 0.75rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--resume-text);
}

/* ── 雷达（SVG 手绘，无图表库）──────────────────────── */
.pro-radar {
  width: 7.5rem;
  height: 7.5rem;
  flex-shrink: 0;
}

.pro-radar-grid {
  fill: none;
  stroke: color-mix(in srgb, var(--resume-border) 80%, transparent);
  stroke-width: 0.6;
}

.pro-radar-axis {
  stroke: color-mix(in srgb, var(--resume-border) 80%, transparent);
  stroke-width: 0.6;
}

.pro-radar-area {
  fill: color-mix(in srgb, var(--resume-primary) 24%, transparent);
  stroke: var(--resume-primary);
  stroke-width: 1.2;
}

.pro-radar-dot {
  fill: var(--resume-primary);
}

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
}
</style>
