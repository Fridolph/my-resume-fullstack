<script setup lang="ts">
import { resolveErrorPage } from '@rs/common'
import MyErrorPage from '#layers/ui/app/components/MyErrorPage.vue'

/**
 * 全局错误页（web）。
 *
 * 与 admin 的 `error.vue` 是同一套共享实现（`MyErrorPage` + `resolveErrorPage`），
 * 差别只在主按钮的去向：web 没有后台首页，401 去 `/login`（若未开放则回公开首页）。
 *
 * ## 为什么要给 web 也建这一页
 *
 * 之前 web 没有任何错误页 —— 404 会落到 Nuxt 的默认黑底页，与产品观感完全脱节。
 * 而 web 是**对外的那一面**，错误页是第一印象的一部分。
 */
const error = useError()

const config = computed(() => resolveErrorPage(error.value?.statusCode, error.value?.statusMessage))

const technical = computed(() => {
  const statusCode = error.value?.statusCode
  const message = error.value?.message
  if (!statusCode && !message) return ''
  return [statusCode, message].filter(Boolean).join(' · ')
})

useHead(() => ({ title: `${config.value.title} · 简历` }))

function runPrimaryAction() {
  switch (config.value.primaryAction) {
    case 'login':
      // ⚠️ web **没有登录页**（只有 admin 有 `/login`）。共享层给出的 `login` 动作
      // 在这里降级为回首页 —— 跳一个不存在的路由只会把 401 变成 404。
      return clearError({ redirect: '/' })
    case 'retry':
      return clearError({ redirect: useRoute().fullPath })
    default:
      return clearError({ redirect: '/' })
  }
}
</script>

<template>
  <MyErrorPage
    :badge="config.badge"
    :icon="config.icon"
    :title="config.title"
    :description="config.description"
    :hint="config.hint"
    :primary-label="config.primaryLabel"
    :technical="technical"
    @primary="runPrimaryAction"
  />
</template>
