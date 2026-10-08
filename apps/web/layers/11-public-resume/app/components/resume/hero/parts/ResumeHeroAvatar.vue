<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'

/**
 * hero · 头像零件（standard / pro 共用）。
 *
 * 两档的**机制相同**：圆形翻牌（正面 `hero.frontImageUrl` / 背面 `hero.backImageUrl`），
 * 差异只在伴随动效 —— pro 多一层鼠标跟随光晕（`glow`）。
 * 所以它是零件而不是两个实现：同一份数据、同一段 3D，只有光晕与徽标不同。
 *
 * 徽标交给调用方（`#badge` 插槽）：standard 是纯装饰的 "talk with me ..."，
 * pro 是真实的求职状态徽标，语义不同，不该由零件替它们决定。
 *
 * ⚠️ 翻牌只是视觉：旧站那头像是指向 `/ai-talk` 的 AI 对话入口，属 `12-ai-talk` 域；
 * 本仓不接跳转（跨域能力另立卡），`hero.linkUrl` 只存不跳。
 *
 * 样式约定：布局 / 尺寸 / 颜色 / 圆角 / 过渡一律写在标签上（Tailwind）；
 * style 块 只留两段 media ——「父 hover 改子 transform」的翻牌与它的 reduced-motion 覆盖
 * （用 `group-hover:` + `motion-reduce:` 变体的优先级取决于生成顺序，不可靠）。
 */
const props = defineProps<ResumeSectionBodyProps>()

/** 徽标由调用方渲染（standard 是装饰徽标、pro 是求职状态），这里只把 availability 递出去 */
defineSlots<{ badge?: (props: { availability: string }) => unknown }>()

const { profile, avatarText, hasAvatarImage, availability } = useHero(props)

const spotlight = ref({ x: 50, y: 30 })
const spotlightOn = ref(false)

/** 光晕跟随鼠标：位置换算成百分比，交给 radial-gradient 的圆心 */
function onGlowMove(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    return
  }

  spotlight.value = {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  }
}

const glowStyle = computed(() => ({
  background: `radial-gradient(circle at ${spotlight.value.x.toFixed(1)}% ${spotlight.value.y.toFixed(1)}%, color-mix(in srgb, var(--resume-primary) 40%, transparent), transparent 60%)`,
}))

const showGlow = computed(() => props.variant === 'pro')
</script>

<template>
  <div class="relative w-fit">
    <div
      class="hero-avatar relative size-28 perspective-[900px]"
      @mouseenter="spotlightOn = true"
      @mousemove="onGlowMove"
      @mouseleave="spotlightOn = false"
    >
      <div
        v-if="hasAvatarImage"
        class="hero-avatar-inner relative size-full transition-[transform] duration-[850ms] ease-[cubic-bezier(0.4,0,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
      >
        <div
          class="absolute inset-0 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--resume-primary)_35%,transparent)] [backface-visibility:hidden]"
        >
          <img :src="profile.hero.frontImageUrl" :alt="`${profile.name} 头像`" class="h-full w-full object-cover" />
        </div>
        <div
          class="absolute inset-0 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--resume-primary)_35%,transparent)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <img
            :src="profile.hero.backImageUrl || profile.hero.frontImageUrl"
            :alt="`${profile.name} 头像（另一面）`"
            class="h-full w-full object-cover"
          />
        </div>
      </div>

      <span
        v-else
        class="grid size-full place-items-center rounded-full text-3xl font-semibold text-white"
        :style="{ background: `linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))` }"
      >
        {{ avatarText }}
      </span>

      <span
        v-if="showGlow"
        class="hero-avatar-glow absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 ease-[ease] pointer-events-none motion-reduce:hidden"
        :class="spotlightOn ? 'is-on' : ''"
        aria-hidden="true"
        :style="glowStyle"
      />
    </div>

    <slot name="badge" :availability="availability" />
  </div>
</template>

<style scoped>
/*
 * 只留 media：Tailwind 变体在这里表达不了「父 hover 改子元素 transform」与
 * 「reduced-motion 下取消它」的组合 —— `group-hover:` 加 `motion-reduce:` 的优先级
 * 取决于生成顺序，不可靠，所以交给媒体查询。
 */
@media (hover: hover) {
  .hero-avatar:hover .hero-avatar-inner {
    transform: rotateY(180deg);
  }

  .hero-avatar-glow.is-on {
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-avatar:hover .hero-avatar-inner {
    transform: none;
  }
}
</style>
