<script setup lang="ts">
import type { ResumeContactItem, ResumeHeroProps } from '#layers/public-resume/app/types/resume'
import { useResumeProfileView } from '#layers/public-resume/app/composables/useResumeProfileView'

/**
 * hero · 精致（pro）—— **展示形式的维度转换**，不是"堆装饰"。
 *
 * 定位（2026-10-08 重设，见 docs/dev/resume-styles.md §14）：
 * pro = 在 standard 之上，把**同一份信息换一种维度去呈现**，文字仍是主体：
 * - **压缩 + tooltip**：联系方式压成「图标 + 截断值」的胶囊，hover 出完整值，点击复制
 * - **折叠**：INTRO 过长时折叠，可展开/收起（带过渡）
 * - **三维动效**：画廊鼠标跟随倾斜（≤ 8°）+ 跟随高光，移开平滑归位
 * - **图表联动**：能力雷达（SVG 手绘）与右侧图例 hover 联动 —— 轴、顶点、数值同时高亮
 * - 以及卡片 hover 立体抬升、数字块 hover 强调、chip hover、状态徽标脉动、入场 stagger
 *
 * 硬约束：所有动效在 `prefers-reduced-motion: reduce` 下**降级为静态**；
 * 不引第三方动画/图表库；排版按「窄栏也能读」设计（不用视口断点）。
 */
const props = defineProps<ResumeHeroProps>()
const { profile, avatarText, slogans, visibleContact } = useResumeProfileView(props)

const gallery = computed(() => profile.value.gallery ?? [])
const stats = computed(() => profile.value.stats ?? [])
const availability = computed(() => profile.value.availability ?? '')

// ── 手法 1：三维动效（鼠标跟随倾斜 + 跟随高光）────────────
const TILT_MAX = 8
const tilt = ref({ rx: 0, ry: 0 })
const spotlight = ref({ x: 50, y: 50 })

function onTiltMove(event: MouseEvent) {
  if (!import.meta.client) {
    return
  }
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width - 0.5
  const py = (event.clientY - rect.top) / rect.height - 0.5

  tilt.value = { rx: -py * TILT_MAX, ry: px * TILT_MAX }
  spotlight.value = { x: (px + 0.5) * 100, y: (py + 0.5) * 100 }
}

function resetTilt() {
  tilt.value = { rx: 0, ry: 0 }
  spotlight.value = { x: 50, y: 50 }
}

const galleryStyle = computed(() => ({
  transform: `perspective(900px) rotateX(${tilt.value.rx.toFixed(2)}deg) rotateY(${tilt.value.ry.toFixed(2)}deg)`,
}))

const spotlightStyle = computed(() => ({
  background: `radial-gradient(circle at ${spotlight.value.x.toFixed(1)}% ${spotlight.value.y.toFixed(1)}%, color-mix(in srgb, var(--resume-primary) 22%, transparent), transparent 60%)`,
}))

// ── 手法 2：压缩 + tooltip + 点击复制 ─────────────────────
const copiedKey = ref<string | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function copyContact(item: ResumeContactItem) {
  if (!import.meta.client || !navigator.clipboard) {
    return
  }

  try {
    await navigator.clipboard.writeText(item.value)
    copiedKey.value = item.key
    if (copyTimer) {
      clearTimeout(copyTimer)
    }
    copyTimer = setTimeout(() => {
      copiedKey.value = null
    }, 1600)
  } catch {
    // 剪贴板不可用（非安全上下文 / 无权限）时静默：tooltip 里仍能看到完整值
  }
}

onBeforeUnmount(() => {
  if (copyTimer) {
    clearTimeout(copyTimer)
  }
})

// ── 手法 3：折叠（INTRO 过长时收起）──────────────────────
/**
 * 阈值按**最窄栏**估：hero 落在 300px 侧栏，中文约 12 字/行，`line-clamp-3` ≈ 3 行 ≈ 36 字。
 * 取 48 留一点余量 —— 原值 84 比"被 clamp 的实际容量"还大，会出现
 * 「内容已被截断，但展开按钮不显示」的缺陷（已验证）。
 */
const INTRO_CLAMP_AT = 48
const introLong = computed(() => (profile.value.summary?.length ?? 0) > INTRO_CLAMP_AT)
const introExpanded = ref(false)

// ── 手法 4：图表联动（雷达 ↔ 图例）───────────────────────
const hoveredAxis = ref<string | null>(null)

// 雷达几何（SVG 手绘，三角函数算顶点；维度 < 3 不画）
const RADAR_SIZE = 120
const RADAR_CENTER = RADAR_SIZE / 2
const RADAR_RADIUS = RADAR_SIZE / 2 - 14

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

const radarArea = computed(() => radarAxes.value.map(axis => `${axis.px.toFixed(1)},${axis.py.toFixed(1)}`).join(' '))

const radarLabelText = computed(() => radarAxes.value.map(axis => `${axis.label} ${axis.value}`).join('，'))
</script>

<template>
  <!-- 画廊：跟随倾斜 + 跟随高光 + 状态徽标 -->
  <div class="relative" @mousemove="onTiltMove" @mouseleave="resetTilt">
    <div v-if="gallery.length" class="pro-gallery" :style="galleryStyle">
      <figure
        v-for="(shot, index) in gallery.slice(0, 4)"
        :key="`${shot.url}-${index}`"
        class="pro-shot"
        :class="index === 0 ? 'col-span-2 aspect-[5/3]' : 'aspect-square'"
      >
        <img
          :src="shot.url"
          :alt="shot.alt || `${profile.name} 的照片`"
          loading="lazy"
          class="h-full w-full object-cover"
        />
      </figure>

      <span class="pro-spotlight" aria-hidden="true" :style="spotlightStyle" />
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

  <!-- INTRO：折叠 / 展开 -->
  <div class="pro-intro pro-reveal" style="--i: 4">
    <span class="resume-eyebrow">Intro</span>
    <p :class="introLong && !introExpanded ? 'pro-clamp' : ''">
      {{ profile.summary }}
    </p>
    <button
      v-if="introLong"
      type="button"
      class="pro-more"
      :aria-expanded="introExpanded"
      @click="introExpanded = !introExpanded"
    >
      {{ introExpanded ? '收起' : '展开' }}
      <UIcon
        name="i-lucide-chevron-down"
        class="size-3.5 transition-transform"
        :class="introExpanded ? 'rotate-180' : ''"
      />
    </button>
  </div>

  <!-- 能力雷达：与图例 hover 联动 -->
  <section v-if="radarAxes.length" class="resume-pro-block pro-reveal" style="--i: 5">
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
          :class="hoveredAxis === axis.label ? 'is-active' : ''"
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
          :class="hoveredAxis === axis.label ? 'is-active' : ''"
          :cx="axis.px"
          :cy="axis.py"
          :r="hoveredAxis === axis.label ? 3 : 1.8"
        />
      </svg>

      <ul class="min-w-0 flex-1 space-y-1">
        <li
          v-for="axis in radarAxes"
          :key="axis.label"
          class="pro-radar-row"
          :class="hoveredAxis === axis.label ? 'is-active' : ''"
          tabindex="0"
          @mouseenter="hoveredAxis = axis.label"
          @mouseleave="hoveredAxis = null"
          @focus="hoveredAxis = axis.label"
          @blur="hoveredAxis = null"
        >
          <span class="resume-muted truncate text-xs">{{ axis.label }}</span>
          <span class="resume-text text-xs font-semibold tabular-nums">{{ axis.value }}</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- 联系方式：压缩成胶囊 + tooltip 完整值 + 点击复制 -->
  <section class="resume-pro-block pro-reveal" style="--i: 6">
    <span class="resume-eyebrow">Contact</span>
    <div class="resume-btn-group">
      <UTooltip v-for="item in visibleContact" :key="item.key" :text="`${item.label}：${item.value} · 点击复制`">
        <button
          type="button"
          class="pro-contact"
          :class="copiedKey === item.key ? 'is-copied' : ''"
          :aria-label="`${item.label}：${item.value}，点击复制`"
          @click="copyContact(item)"
        >
          <UIcon :name="copiedKey === item.key ? 'i-lucide-check' : item.icon" class="size-4 shrink-0" />
          <span class="pro-contact-value">{{ item.value }}</span>
        </button>
      </UTooltip>
    </div>
  </section>

  <!-- 个人链接：chip hover 抬升 -->
  <section v-if="profile.links.length" class="resume-pro-block pro-reveal" style="--i: 7">
    <span class="resume-eyebrow">Links</span>
    <div class="resume-btn-group">
      <a
        v-for="link in profile.links"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noreferrer"
        class="resume-pro-chip pro-chip-hover"
      >
        <UIcon :name="link.icon || 'i-lucide-external-link'" class="resume-accent size-4" />
        {{ link.label }}
      </a>
    </div>
  </section>

  <!-- 兴趣 -->
  <section v-if="profile.interests.length" class="resume-pro-block pro-reveal" style="--i: 8">
    <span class="resume-eyebrow">Interests</span>
    <div class="resume-btn-group">
      <span v-for="interest in profile.interests" :key="interest.label" class="resume-pro-chip pro-chip-hover">
        <UIcon v-if="interest.icon" :name="interest.icon" class="resume-accent size-4" />
        {{ interest.label }}
      </span>
    </div>
  </section>
</template>

<style scoped>
/* 说明：交互与动效集中在本文件；跨区块可复用的零件样式在 app/assets/css/resume.css */

/* ── 画廊：跟随倾斜 + 跟随高光（三维动效）───────────── */
.pro-gallery {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  transform-style: preserve-3d;
}

.pro-shot {
  overflow: hidden;
  border: 1px solid var(--resume-border);
  border-radius: calc(var(--resume-card-radius) * 0.6);
  transition: border-color 0.25s ease;
}

@media (hover: hover) {
  .pro-gallery:hover .pro-shot {
    border-color: color-mix(in srgb, var(--resume-primary) 45%, transparent);
  }
}

.pro-spotlight {
  position: absolute;
  inset: -10%;
  border-radius: 1rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

@media (hover: hover) {
  .pro-gallery:hover .pro-spotlight {
    opacity: 1;
  }
}

/* ── 求职状态：脉动点 ───────────────────────────────── */
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

/* ── INTRO：折叠 / 展开 ─────────────────────────────── */
.pro-intro {
  margin-top: 0.75rem;
  border: 1px solid var(--resume-border);
  border-radius: calc(var(--resume-card-radius) * 0.6);
  padding: 0.75rem;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--resume-text);
}

.pro-clamp {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.pro-more {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  margin-top: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--resume-primary);
  cursor: pointer;
}

@media (hover: hover) {
  .pro-more:hover {
    text-decoration: underline;
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

/* ── 雷达：与图例联动 ───────────────────────────────── */
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
  transition:
    stroke 0.2s ease,
    stroke-width 0.2s ease;
}

.pro-radar-axis.is-active {
  stroke: var(--resume-primary);
  stroke-width: 1.2;
}

.pro-radar-area {
  fill: color-mix(in srgb, var(--resume-primary) 24%, transparent);
  stroke: var(--resume-primary);
  stroke-width: 1.2;
}

.pro-radar-dot {
  fill: var(--resume-primary);
  transition: r 0.2s ease;
}

.pro-radar-dot.is-active {
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--resume-primary) 60%, transparent));
}

.pro-radar-row {
  border-radius: 0.375rem;
  padding-inline: 0.25rem;
  transition: background-color 0.2s ease;
}

.pro-radar-row.is-active {
  background: color-mix(in srgb, var(--resume-primary) 12%, transparent);
}

/* ── 联系方式：压缩胶囊 + 复制反馈 ──────────────────── */
.pro-contact {
  display: inline-flex;
  max-width: 11rem;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--resume-border);
  border-radius: 9999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  color: var(--resume-muted);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.pro-contact-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (hover: hover) {
  .pro-contact:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--resume-primary) 50%, transparent);
    color: var(--resume-text);
  }
}

.pro-contact.is-copied {
  border-color: var(--resume-primary);
  color: var(--resume-primary);
}

/* ── chip：hover 抬升 ───────────────────────────────── */
.pro-chip-hover {
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .pro-chip-hover:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--resume-primary) 45%, transparent);
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
  .pro-gallery,
  .pro-shot,
  .pro-spotlight,
  .pro-stat-hover,
  .pro-contact,
  .pro-chip-hover,
  .pro-radar-axis,
  .pro-radar-dot,
  .pro-radar-row,
  .gradient-copy {
    transition: none;
    animation: none;
  }

  .pro-availability-dot,
  .pro-reveal {
    animation: none;
  }

  .pro-gallery {
    transform: none !important;
  }

  .pro-spotlight {
    display: none;
  }

  @media (hover: hover) {
    .pro-stat-hover:hover,
    .pro-contact:hover,
    .pro-chip-hover:hover {
      transform: none;
    }
  }
}
</style>
