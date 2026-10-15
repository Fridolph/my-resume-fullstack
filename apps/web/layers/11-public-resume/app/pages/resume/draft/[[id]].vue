<script setup lang="ts">
import ResumeDraftWorkspace from '#layers/public-resume/app/components/resume/draft/ResumeDraftWorkspace.vue'

/**
 * 草稿工作台。
 *
 * `/resume/draft/:id` 打开指定简历；`/resume/draft`（无 id）回退到 localStorage 里
 * "上次编辑的那份" —— 后者是兼容入口，正常入口是 `/resume` 列表页。
 */
definePageMeta({ title: '简历工作台' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const resumeId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
</script>

<template><ResumeDraftWorkspace :initial-id="resumeId" /></template>
