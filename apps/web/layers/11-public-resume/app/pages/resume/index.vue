<script setup lang="ts">
definePageMeta({
  title: "公开简历",
});

/**
 * 公开简历域入口（骨架）。
 *
 * 后续要落在这里的区块先登记清楚，避免渲染逻辑散到 `app/pages` 或 admin。
 */
const plannedSections = [
  { label: "基本信息与亮点", description: "姓名、定位、一句概括与亮点条目", icon: "i-lucide-user-round" },
  { label: "经历与项目", description: "工作经历、项目清单与时间线", icon: "i-lucide-briefcase-business" },
  { label: "技能与图表", description: "技能分组与可视化图表", icon: "i-lucide-chart-pie" },
  { label: "语言与主题", description: "访客可切换的语言版本与主题", icon: "i-lucide-languages" },
];
</script>

<template>
  <main class="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
    <section>
      <UBadge color="primary" variant="subtle">layers/11-public-resume</UBadge>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">公开简历</h1>
      <p class="mt-3 max-w-2xl text-base leading-7 text-muted">
        公开简历展示域的骨架页。内容来自后端已发布的简历快照，按 draft 承载不同语言与定制版本。
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <UCard v-for="item in plannedSections" :key="item.label">
        <div class="flex gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UIcon :name="item.icon" class="size-5" />
          </span>
          <div>
            <p class="font-medium text-highlighted">{{ item.label }}</p>
            <p class="mt-1 text-sm text-muted">{{ item.description }}</p>
          </div>
        </div>
      </UCard>
    </section>
  </main>
</template>
