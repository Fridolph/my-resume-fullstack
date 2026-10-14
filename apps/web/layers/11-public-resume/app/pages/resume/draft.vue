<script setup lang="ts">
import ResumeDraftWorkspace from '#layers/public-resume/app/components/resume/draft/ResumeDraftWorkspace.vue'
definePageMeta({ title: '我的简历草稿' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template><ResumeDraftWorkspace /></template>
