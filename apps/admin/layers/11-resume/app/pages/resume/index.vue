<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: '简历',
})

/**
 * 简历域入口（骨架）。
 *
 * 本页当前只承担两件事：
 * 1. 验证 `layers/11-resume` 被 Nuxt 正常发现、导航与布局生效；
 * 2. 声明后续要落在这个域里的模块，避免功能散落到别处。
 */
const plannedModules = [
  {
    label: '草稿编辑',
    description: '按 draft 编辑简历内容（去字段级 locale，多份草稿）',
    icon: 'i-lucide-pencil-line',
    status: 'planned',
  },
  {
    label: '版面布局',
    description: '选择与调整简历版式，决定各区块的呈现顺序',
    icon: 'i-lucide-layout-template',
    status: 'planned',
  },
  {
    label: '主题',
    description: '配色与排版主题，影响公开站的呈现',
    icon: 'i-lucide-palette',
    status: 'planned',
  },
  {
    label: '版本与对比',
    description: '草稿版本列表与差异对比',
    icon: 'i-lucide-git-compare',
    status: 'planned',
  },
]

const statusMeta: Record<string, { label: string; color: 'neutral' | 'warning' }> = {
  planned: { label: '待开发', color: 'warning' },
  ready: { label: '可用', color: 'neutral' },
}
</script>

<template>
  <div class="content-pad space-y-6">
    <section>
      <h2 class="text-xl font-semibold tracking-tight text-highlighted">简历</h2>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-muted">
        简历编辑域的骨架页。数据层已接 Pinia Colada，业务模块按里程碑逐个落地。
      </p>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <UCard v-for="item in plannedModules" :key="item.label" :ui="{ body: 'p-5 sm:p-5' }">
        <div class="flex items-start justify-between gap-4">
          <div class="flex gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="item.icon" class="size-5" />
            </span>
            <div>
              <p class="font-medium text-highlighted">{{ item.label }}</p>
              <p class="mt-1 text-sm text-muted">{{ item.description }}</p>
            </div>
          </div>
          <UBadge
            :color="statusMeta[item.status]?.color ?? 'neutral'"
            variant="subtle"
            :label="statusMeta[item.status]?.label ?? item.status"
          />
        </div>
      </UCard>
    </section>
  </div>
</template>
