<script setup lang="ts">
/** 空布局 Header 返回操作：指定站内目标优先，否则回到站内上一页；无历史时回首页。 */
const props = withDefaults(defineProps<{ to?: string; fallbackTo?: string; label?: string }>(), {
  fallbackTo: '/',
  label: '返回上一页',
})
const router = useRouter()

/** 仅接纳站内绝对路径，避免首次打开页面时意外离开站点。 */
function localPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
}
function back() {
  if (localPath(props.to)) {
    void router.push(props.to)
  } else if (localPath(router.options.history.state.back)) {
    router.back()
  } else {
    void router.push(localPath(props.fallbackTo) ? props.fallbackTo : '/')
  }
}
</script>

<template>
  <UTooltip :text="label">
    <UButton
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      size="lg"
      :aria-label="label"
      class="shrink-0"
      @click="back"
    />
  </UTooltip>
</template>
