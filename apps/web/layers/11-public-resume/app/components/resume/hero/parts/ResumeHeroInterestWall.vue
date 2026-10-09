<script setup lang="ts">
import type { ResumeProfileInterest, ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'
import { useHero } from '#layers/public-resume/app/composables/useHero'

/**
 * hero · 兴趣墙零件（standard / pro 同一形态，按 `variant` 递进）。
 *
 * 形态回到最朴素的一种：**一个兴趣一个图标**，hover 出 tooltip（说明）。
 * 之前的「折叠 + 图 + 标签词云」被 Owner 判定为过度设计 —— 兴趣是低信息密度的次要内容，
 * 值得的递进只有"能不能点"：
 *
 * | 档         | 交互                                        |
 * | ---------- | ------------------------------------------- |
 * | `standard` | 纯展示（hover 动效后续再补，当前无任何事件） |
 * | `pro`      | 多一个点击 → 全屏 gallery 浏览该兴趣的图集   |
 * | `minimal`  | 不含这一区（保持默认观感不变）               |
 *
 * 只有**配了图集**的兴趣才是可点的；没配就是普通标签（不给出"点了没反应"的假入口）。
 */
const props = defineProps<ResumeSectionBodyProps>()
const { interests } = useHero(props)

const clickable = computed(() => props.variant === 'pro')

const galleryOpen = ref(false)
const activeInterest = ref<ResumeProfileInterest | null>(null)

/** 没配图集的兴趣不给点击 */
function isInteractive(item: ResumeProfileInterest) {
  return clickable.value && (item.images?.length ?? 0) > 0
}

function openGallery(item: ResumeProfileInterest) {
  if (!isInteractive(item)) {
    return
  }

  activeInterest.value = item
  galleryOpen.value = true
}

/** 图集 → gallery 卡片（标题缺省用兴趣名） */
const galleryItems = computed(() =>
  (activeInterest.value?.images ?? []).map((image, index) => ({
    id: `${activeInterest.value?.label ?? 'interest'}-${index}`,
    url: image.url,
    title: image.title || activeInterest.value?.label,
    href: image.href,
  })),
)
</script>

<template>
  <div v-if="interests.length" class="mt-4 grid gap-2">
    <span class="resume-eyebrow">Interests</span>

    <div class="flex flex-wrap gap-2">
      <UTooltip
        v-for="item in interests"
        :key="item.label"
        :text="item.description || item.label"
        :disabled="!item.description"
      >
        <button
          v-if="isInteractive(item)"
          type="button"
          class="hero-hobby is-interactive cursor-pointer inline-flex items-center gap-[0.35rem] rounded-full border border-[var(--resume-border)] px-[0.6rem] py-1 text-[0.75rem] font-semibold resume-muted transition-[border-color,color,transform] duration-200 ease-[ease] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--resume-primary)_50%,transparent)] hover:text-[var(--resume-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--resume-primary)] active:scale-[0.97]"
          :aria-label="`${item.label}：查看图集`"
          @click="openGallery(item)"
        >
          <UIcon :name="item.icon || 'i-lucide-sparkles'" class="size-4 resume-accent" />
          <span>{{ item.label }}</span>
        </button>

        <span
          v-else
          class="hero-hobby inline-flex items-center gap-[0.35rem] rounded-full border border-[var(--resume-border)] px-[0.6rem] py-1 text-[0.75rem] font-semibold resume-muted transition-[border-color,color,transform] duration-200 ease-[ease] hover:border-[color-mix(in_srgb,var(--resume-primary)_40%,transparent)]"
        >
          <UIcon :name="item.icon || 'i-lucide-sparkles'" class="size-4 resume-accent" />
          <span>{{ item.label }}</span>
        </span>
      </UTooltip>
    </div>

    <!-- 只有 pro 才挂弹窗（standard 是纯展示） -->
    <MyFullScreenGallery
      v-if="clickable"
      v-model:open="galleryOpen"
      :title="activeInterest?.label"
      :description="activeInterest?.description"
      :items="galleryItems"
    />
  </div>
</template>

<style scoped>
/*
 * 只留 reduced-motion：hover 位移要"同时取消位移本身"，用 `motion-reduce:hover:translate-y-0`
 * 与 `hover:-translate-y-px` 的优先级取决于生成顺序，交给媒体查询更稳。
 * 其余（布局 / 胶囊 / hover / focus-visible / active）全在标签上。
 */
@media (prefers-reduced-motion: reduce) {
  .hero-hobby {
    transition: none;
  }

  .hero-hobby.is-interactive:hover {
    transform: none;
  }
}
</style>
