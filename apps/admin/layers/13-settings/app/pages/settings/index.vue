<script setup lang="ts">
/**
 * /settings 索引页：默认跳到第一个子页面，避免空内容。
 */
definePageMeta({
  middleware(to) {
    if (!to.redirectedFrom) {
      return navigateTo("/settings/company", { replace: true });
    }
  },
});
</script>

<template>
  <div />
</template>
