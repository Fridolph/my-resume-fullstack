<script setup lang="ts">
definePageMeta({
  // 页面级守卫：配置相关页面需要进后台的权限（见 docs/dev/identity-and-access.md §3.4）
  middleware: 'permission',
  permissions: ['Admin.Console:view'],
  title: 'Company profile',
})
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Company profile</h1>
    <p class="mt-2 text-sm text-muted">Placeholder — implement this settings page here.</p>
  </div>
</template>
