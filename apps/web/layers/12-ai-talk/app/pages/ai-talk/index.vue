<script setup lang="ts">
definePageMeta({
  title: "AI 对话",
});

const plannedParts = [
  {
    label: "对话界面",
    description: "消息列表、输入区与流式渲染",
    icon: "i-lucide-messages-square",
  },
  { label: "会话切换", description: "多会话列表与历史加载", icon: "i-lucide-history" },
  {
    label: "访客线索",
    description: "访客身份与联系方式线索（写入后端）",
    icon: "i-lucide-user-plus",
  },
  { label: "配额与限流提示", description: "试用码 / 轮次限制的访客侧反馈", icon: "i-lucide-gauge" },
];
</script>

<template>
  <main class="content-max space-y-8 px-6 py-10">
    <section>
      <UBadge color="primary" variant="subtle">layers/12-ai-talk</UBadge>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">AI 对话</h1>
      <p class="mt-3 max-w-2xl text-base leading-7 text-muted">
        访客 AI 对话域的骨架页。公开站只保留对话能力，业务型 AI 功能放在 admin。
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <UCard v-for="item in plannedParts" :key="item.label">
        <div class="flex gap-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
          >
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
