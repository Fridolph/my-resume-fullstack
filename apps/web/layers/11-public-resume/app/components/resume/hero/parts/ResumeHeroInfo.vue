<script setup lang="ts">
import type { ResumeContactItem, ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'
import { useHeroKeys } from '#layers/public-resume/app/composables/useHeroKeys'

/**
 * hero · Info 零件（原 Contact）。
 *
 * 为什么叫 Info：这一块实际装的是「学历 / 年限 / 所在地 / 邮箱 / 电话」这类**基本信息**，
 * 学历也在其中 —— 叫 Contact 名不副实，改 Info 后信息浓度更高、也容得下更多条目。
 *
 * 两档形态：
 * - `standard`：条目卡（图标 + 完整值），**只读展示**
 * - `pro`：压缩胶囊 + 琴键交互 —— 点击复制 + 按 C 大调音阶逐个键位发声（`useHeroKeys`），
 *   按压缩放 + ✓ + 涟漪；tooltip **只给真被截断的那条**（否则是冗余的重复信息）
 *
 * `useHeroKeys` 在首次点击时才创建 `AudioContext`（浏览器要求音频由用户手势解锁），
 * 全流程静默容错，不会影响复制。
 */
const props = defineProps<ResumeSectionBodyProps>()
const { visibleContact } = useHero(props)
const { playKey } = useHeroKeys()

const copiedKey = ref<string | null>(null)
/** 哪几条的完整值被截断 → 只有它们需要 tooltip */
const truncated = ref<Record<string, boolean>>({})
let copyTimer: ReturnType<typeof setTimeout> | null = null

/**
 * hover 时实测「被截断的量」，写进 `--info-shift` 供滚动动画使用。
 *
 * 为什么不用纯 CSS 算：`translateX` 的百分比基准是**元素自身宽度**（即裁剪后的可见宽度），
 * 不是内容完整宽度 —— `calc(-100% + 可视宽)` 永远得不到「内容宽 − 可视宽」。
 * 顺手把"是否截断"记下来，tooltip 只挂在真截断的条目上。
 */
function measureValue(event: Event, key: string) {
  const el = event.currentTarget as HTMLElement
  const value = el.querySelector<HTMLElement>('.hero-info-value')
  if (!value) {
    return
  }

  const overflow = value.scrollWidth - value.clientWidth
  el.style.setProperty('--info-shift', overflow > 0 ? `-${overflow}px` : '0px')

  if (Boolean(truncated.value[key]) !== overflow > 0) {
    truncated.value = { ...truncated.value, [key]: overflow > 0 }
  }
}

/** 点击 = 弹一个琴键（音高按顺序递升）+ 复制该条完整值 */
async function activate(item: ResumeContactItem, index: number) {
  playKey(index)
  await copy(item)
}

async function copy(item: ResumeContactItem) {
  if (!import.meta.client || !navigator.clipboard) {
    return
  }

  try {
    await navigator.clipboard.writeText(item.value)
    // 移动端触觉反馈；不支持的平台静默跳过
    navigator.vibrate?.(8)
    copiedKey.value = item.key
    if (copyTimer) {
      clearTimeout(copyTimer)
    }
    copyTimer = setTimeout(() => {
      copiedKey.value = null
    }, 1600)
  } catch {
    // 剪贴板不可用（非安全上下文 / 无权限）时静默：tooltip 仍能看到完整值
  }
}

onBeforeUnmount(() => {
  if (copyTimer) {
    clearTimeout(copyTimer)
  }
})
</script>

<template>
  <!-- pro：压缩胶囊 + 琴键 -->
  <section v-if="variant === 'pro'" class="resume-pro-block">
    <span class="resume-eyebrow">Info</span>
    <div class="resume-btn-group">
      <UTooltip
        v-for="(item, index) in visibleContact"
        :key="item.key"
        :text="`${item.label}：${item.value} · 点击复制`"
        :disabled="!truncated[item.key]"
      >
        <button
          type="button"
          class="hero-info-key resume-muted relative inline-flex max-w-44 cursor-pointer items-center gap-[0.35rem] rounded-full border border-b-2 border-[var(--resume-border)] px-[0.6rem] py-1 text-[0.75rem] [background:linear-gradient(180deg,color-mix(in_srgb,var(--resume-surface)_96%,var(--resume-primary)),color-mix(in_srgb,var(--resume-chip-bg)_65%,var(--resume-surface)))] hover:border-[color-mix(in_srgb,var(--resume-primary)_50%,transparent)] hover:text-[var(--resume-text)] active:border-b active:[transform:translateY(1px)_scale(0.985)]"
          :class="copiedKey === item.key ? 'is-copied' : ''"
          :aria-label="`${item.label}：${item.value}，点击复制`"
          @mouseenter="measureValue($event, item.key)"
          @focus="measureValue($event, item.key)"
          @click="activate(item, index)"
        >
          <UIcon :name="copiedKey === item.key ? 'i-lucide-check' : item.icon" class="size-4 shrink-0" />
          <span class="hero-info-value">{{ item.value }}</span>
        </button>
      </UTooltip>
    </div>
  </section>

  <!-- standard：条目卡（圆角收敛：外层 0.5rem / 条目 0.375rem） -->
  <div v-else class="mt-5 grid gap-2 rounded-lg border border-[var(--resume-border)] p-4">
    <span class="resume-eyebrow">Info</span>
    <div
      v-for="item in visibleContact"
      :key="item.key"
      class="hero-info-item flex items-start gap-3 rounded-md border border-[var(--resume-border)] px-3 py-2 transition-[transform,border-color,box-shadow] duration-200 ease-[ease] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--resume-primary)_45%,transparent)] hover:shadow-[0_12px_24px_color-mix(in_srgb,var(--resume-primary)_10%,transparent)]"
    >
      <UIcon :name="item.icon" class="resume-accent mt-0.5 size-4 shrink-0" />
      <span class="sr-only">{{ item.label }}</span>
      <span class="resume-muted min-w-0 break-all text-sm">{{ item.value }}</span>
    </div>
  </div>
</template>

<style scoped>
/*
 * 只留「标签上表达不好」的：
 * 1. 琴键的 transition —— 四个属性两两不同时长，写成工具类反而更难读；
 * 2. 两个 @keyframes（滚动出场 / 复制涟漪）与它们的触发条件（hover、`.is-copied::after`）；
 * 3. 配套的 media（hover 内触发动画、reduced-motion 关闭）。
 */
.hero-info-key {
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.12s ease,
    border-bottom-width 0.12s ease;
}

.hero-info-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (hover: hover) {
  /* 单程滚出被截断的部分：位移由 `measureValue` 实测写入 */
  .hero-info-key:hover .hero-info-value {
    animation: hero-info-scroll 1.5s ease-in-out 0.2s both;
  }
}

/* 复制成功：一圈涟漪扩散（状态反馈，不是装饰） */
.hero-info-key.is-copied {
  border-color: var(--resume-primary);
  color: var(--resume-primary);
}

.hero-info-key.is-copied::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--resume-primary);
  border-radius: inherit;
  pointer-events: none;
  animation: hero-info-ripple 0.6s ease-out;
}

@keyframes hero-info-scroll {
  0%,
  30% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(var(--info-shift, 0px));
  }
}

@keyframes hero-info-ripple {
  from {
    opacity: 0.8;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(1.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-info-key,
  .hero-info-item {
    transition: none;
  }

  .hero-info-key:hover .hero-info-value,
  .hero-info-key.is-copied::after {
    animation: none;
  }

  .hero-info-item:hover {
    transform: none;
  }
}
</style>
