<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'

/**
 * 工作经历 · 精致。
 *
 * 与另两档的**结构差异**：左侧时间线（连线 + 圆点）串起多段经历，
 * 公司/时间做成两端对齐的标题行，职位用强调色，成果用小圆点列表 + 圆角标签。
 *
 * 时间线是本区块独有零件，所以样式留在组件 scoped 里；
 * 跨区块复用的零件（block / chip / stats）已上提到 `resume.css`。
 */
defineProps<ResumeSectionBodyProps>()
</script>

<template>
  <ol class="exp-timeline">
    <li v-for="item in content.experience" :key="item.company" class="exp-item">
      <span class="exp-dot" aria-hidden="true" />

      <div class="resume-pro-block mt-0">
        <header class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p class="resume-text text-sm font-semibold">{{ item.company }}</p>
          <p class="resume-muted text-xs">{{ item.period }}</p>
        </header>

        <p class="resume-accent text-xs font-medium">
          {{ item.role }}<template v-if="item.domain"> · {{ item.domain }}</template>
        </p>

        <p v-if="item.overview" class="resume-muted">{{ item.overview }}</p>

        <ul
          v-if="options.showAchievements && item.achievements?.length"
          class="exp-achievements"
        >
          <li v-for="line in item.achievements" :key="line">{{ line }}</li>
        </ul>

        <div v-if="options.showTechStack && item.tech?.length" class="flex flex-wrap gap-1.5">
          <span v-for="tech in item.tech" :key="tech" class="resume-pro-chip">{{ tech }}</span>
        </div>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.exp-timeline {
  display: grid;
  gap: 1rem;
}

.exp-item {
  position: relative;
  padding-inline-start: 1.15rem;
}

/* 竖线：从顶部渐隐到底部，避免"一整条硬线" */
.exp-item::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0.25rem;
  width: 1px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--resume-primary) 45%, transparent),
    var(--resume-border)
  );
}

.exp-dot {
  position: absolute;
  inset-inline-start: 0;
  top: 0.35rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 9999px;
  background: var(--resume-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--resume-primary) 18%, transparent);
}

.exp-achievements {
  display: grid;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--resume-muted);
}

.exp-achievements li {
  position: relative;
  padding-inline-start: 0.85rem;
}

.exp-achievements li::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  top: 0.55rem;
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--resume-primary) 55%, transparent);
}
</style>
