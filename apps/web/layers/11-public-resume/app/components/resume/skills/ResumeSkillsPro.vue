<script setup lang="ts">
import type { ResumeSectionBodyProps } from '#layers/public-resume/app/types/resume'

/**
 * 专业技能 · 精致。
 *
 * 与 standard 的**结构差异**：每组有「eyebrow 组名 + 渐隐细线 + 数量」的组头，
 * 标签改成圆角 `.resume-pro-chip`，组间距更大 —— 靠层级而不是加装饰来显精致。
 *
 * （能力雷达是 hero 的零件，本轮不往 skills 搬；真复用时再上提，见 DAO-015 的约定。）
 */
defineProps<ResumeSectionBodyProps>()
</script>

<template>
  <section v-for="group in content.skills" :key="group.group" class="skills-group">
    <header class="skills-head">
      <span class="resume-eyebrow">{{ group.group }}</span>
      <span class="skills-rule" aria-hidden="true" />
      <span class="resume-muted text-xs">{{ group.items.length }}</span>
    </header>

    <div class="flex flex-wrap gap-1.5">
      <span v-for="skill in group.items" :key="skill" class="resume-pro-chip">{{ skill }}</span>
    </div>
  </section>
</template>

<style scoped>
.skills-group {
  display: grid;
  gap: 0.5rem;
}

.skills-group + .skills-group {
  margin-top: 1rem;
}

.skills-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.skills-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--resume-border), transparent);
}
</style>
