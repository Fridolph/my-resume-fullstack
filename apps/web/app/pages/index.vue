<script setup lang="ts">
const config = useRuntimeConfig();
const apiStatus = shallowRef("checking");

async function checkApi() {
  try {
    await $fetch("/health", { baseURL: config.public.apiBase });
    apiStatus.value = "connected";
  } catch {
    apiStatus.value = "offline";
  }
}

await checkApi();
</script>

<template>
  <main
    class="min-h-screen bg-linear-to-br from-primary-50 via-default to-default px-6 py-16 dark:from-primary-950/40"
  >
    <div class="mx-auto max-w-4xl space-y-10">
      <header class="space-y-4">
        <UBadge color="primary" variant="subtle">@template/web</UBadge>
        <h1 class="text-4xl font-bold tracking-tight text-highlighted sm:text-6xl">全栈应用模板</h1>
        <p class="max-w-2xl text-lg text-muted">
          Nuxt 4、Nuxt UI、Tailwind CSS 4 与 NestJS 的可复用起点。
        </p>
      </header>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <h2 class="font-semibold text-highlighted">开发环境状态</h2>
            <UButton
              icon="i-lucide-refresh-cw"
              variant="ghost"
              label="重新检查"
              @click="checkApi"
            />
          </div>
        </template>
        <div class="flex items-center gap-3">
          <span
            class="size-3 rounded-full"
            :class="
              apiStatus === 'connected'
                ? 'bg-success'
                : apiStatus === 'offline'
                  ? 'bg-error'
                  : 'bg-warning'
            "
          />
          <span>API 心跳：{{ apiStatus }}</span>
        </div>
      </UCard>
    </div>
  </main>
</template>
