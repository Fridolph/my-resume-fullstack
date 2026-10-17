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
      return clearError({ redirect: '/login' })
    case 'retry':
      return clearError({ redirect: useRoute().fullPath })
    default:
      return clearError({ redirect: '/' })
  }
}
</script>

<template>
  <MyErrorPage :config="config" :technical="technical" @primary="runPrimaryAction" />
</template>
