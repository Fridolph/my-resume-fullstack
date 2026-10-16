<script setup lang="ts">
 /**
 * empty —— 无边框布局
 *
 * 不做任何应用外壳，直接把页面内容渲染出来。
 * 适合需要完全自控的页面（打印、落地页、自定义全屏场景等）。
 */
</script>

<template>
  <div class="min-h-dvh">
    <slot />
  </div>
</template>
