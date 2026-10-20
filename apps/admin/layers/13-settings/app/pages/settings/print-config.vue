<script setup lang="ts">
import PrintConfigEditor from '../../components/print-config/PrintConfigEditor.vue'

definePageMeta({
  middleware: ['auth', 'permission'],
  permissions: ['Admin.Console:view', 'Resume.Display:edit'],
  title: 'PDF 与打印预设',
})
</script>

<template>
  <PrintConfigEditor />
</template>
