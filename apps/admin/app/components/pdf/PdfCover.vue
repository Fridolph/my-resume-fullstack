<script lang="ts" setup>
interface Props {
  /** 下半部分渐变起始色 */
  gradientFrom?: string;
  /** 下半部分渐变结束色 */
  gradientTo?: string;
}

const props = withDefaults(defineProps<Props>(), {
  gradientFrom: "#00e944",
  gradientTo: "#06f",
});

const gradientStyle = computed(() => ({
  background: `linear-gradient(132deg, ${props.gradientFrom} 0%, ${props.gradientTo} 101.41%)`,
}));
</script>

<template>
  <PdfPage page-type="cover" class="pdf-cover" :content-class="{ flex: true, 'flex-col': true }">
    <template v-if="$slots.top || $slots.bottom">
      <div class="pdf-cover__top relative min-h-0 flex-1 max-h-4/10 bg-white">
        <slot name="top" />
      </div>

      <div class="pdf-cover__bottom relative min-h-0 flex-1 text-white" :style="gradientStyle">
        <slot name="bottom" />
      </div>
    </template>

    <slot v-else />
  </PdfPage>
</template>
