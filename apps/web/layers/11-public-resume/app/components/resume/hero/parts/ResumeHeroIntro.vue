<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'
import { useHeroTyping } from '#layers/public-resume/app/composables/useHeroTyping'

/**
 * hero · Intro 零件（pro）。
 *
 * 两层结构 + 打字机：
 * - **主张句**升为大字，由左至右逐字显形（节奏与循环见 `useHeroTyping`），光标在打字窗口结束后停住
 * - **其余句**默认折到 2 行，可展开/收起；是否折叠按**实测溢出**决定，不用字数阈值
 *   （DAO-016 的实测缺陷正是"阈值比 clamp 容量大" → 内容被截却不显示按钮）
 * - hover 某句时其余句淡出（注意力收拢）
 *
 * 打字与折叠顺序：第一个字显形 → … → 全部显形 → 光标停住 → 停留 5s → 从头重播。
 */
const props = defineProps<ResumeSectionBodyProps>()
const { profile } = useHero(props)

const { lead, leadChars, rest, restText, typingWindow, cycle, speed } = useHeroTyping(() => profile.value.summary)

const restRef = useTemplateRef<HTMLElement>('restRef')
const restCollapsed = ref(true)
/** 初始按"可能溢出"渲染：保证「内容被截」时按钮一定在，挂载后再用实测结果修正 */
const restOverflow = ref(true)

function measureRest() {
  const el = restRef.value
  if (!el || !restCollapsed.value) {
    return
  }

  restOverflow.value = el.scrollHeight > el.clientHeight + 1
  if (!restOverflow.value) {
    restCollapsed.value = false
  }
}

onMounted(() => {
  void nextTick(measureRest)
})

watch(restText, () => {
  restCollapsed.value = true
  void nextTick(measureRest)
})
</script>

<template>
  <div class="mt-4 grid gap-2" :style="`--typing-speed: ${speed}ms`">
    <span class="resume-eyebrow">Intro</span>

    <!-- 重播靠 `cycle` 换 key 让 Vue 重建节点；SSR 输出的是完整全文（可选中 / 可读屏） -->
    <p
      v-if="lead"
      :key="`lead-${cycle}`"
      class="resume-text text-[0.95rem] leading-[1.65] font-semibold"
      :style="`--typing: ${typingWindow}`"
    >
      <span class="sr-only">{{ lead }}</span>
      <span aria-hidden="true">
        <span v-for="(char, index) in leadChars" :key="index" class="hero-intro-char" :style="`--i: ${index}`">{{
          char
        }}</span>
      </span>
      <span class="hero-intro-caret" aria-hidden="true" />
    </p>

    <div v-if="rest.length" class="hero-intro-rest grid gap-[0.4rem]">
      <div ref="restRef" :class="restCollapsed ? 'line-clamp-2' : ''">
        <p
          v-for="sentence in rest"
          :key="sentence"
          class="hero-intro-sentence resume-muted text-[0.85rem] leading-[1.65] transition-opacity duration-200 ease-[ease]"
        >
          {{ sentence }}
        </p>
      </div>

      <button
        v-if="restOverflow"
        type="button"
        class="resume-accent inline-flex cursor-pointer items-center gap-[0.15rem] justify-self-start text-[0.75rem] font-semibold hover:underline"
        :aria-expanded="!restCollapsed"
        @click="restCollapsed = !restCollapsed"
      >
        {{ restCollapsed ? '展开全文' : '收起' }}
        <UIcon
          name="i-lucide-chevron-down"
          class="size-3.5 transition-transform"
          :class="restCollapsed ? '' : 'rotate-180'"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
 * 只留三样：
 * 1. 打字与光标的两组 @keyframes（时长由 `--typing-speed` / `--typing` 变量驱动）；
 * 2. 「父 hover 时其余句淡出、被 hover 的那句恢复」—— 父子联动，用 `group-hover:`
 *    搭配子元素自身 `hover:` 的优先级取决于生成顺序，交给媒体查询更稳；
 * 3. 配套的 reduced-motion 关闭。
 */
.hero-intro-char {
  opacity: 0;
  animation: hero-intro-char-in 1ms linear both;
  animation-delay: calc(var(--i) * var(--typing-speed, 200ms));
}

@keyframes hero-intro-char-in {
  to {
    opacity: 1;
  }
}

/* 光标：打字窗口内闪烁，窗口一到就停住（`--typing` 由字数 × 速度算出） */
.hero-intro-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.12em;
  background: var(--resume-primary);
  animation:
    hero-intro-caret-blink 0.7s steps(1, end) infinite,
    hero-intro-caret-out 1ms linear var(--typing, 900ms) forwards;
}

@keyframes hero-intro-caret-blink {
  50% {
    opacity: 0;
  }
}

@keyframes hero-intro-caret-out {
  to {
    opacity: 0;
  }
}

@media (hover: hover) {
  .hero-intro-rest:hover .hero-intro-sentence {
    opacity: 0.45;
  }

  .hero-intro-rest .hero-intro-sentence:hover {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-intro-char,
  .hero-intro-caret {
    animation: none;
  }

  .hero-intro-char {
    opacity: 1;
  }

  .hero-intro-caret {
    display: none;
  }

  .hero-intro-sentence {
    transition: none;
  }

  .hero-intro-rest:hover .hero-intro-sentence,
  .hero-intro-rest .hero-intro-sentence:hover {
    opacity: 1;
  }
}
</style>
