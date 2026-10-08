<script setup lang="ts">
import type { ResumeBackgroundConfig } from "#layers/public-resume/app/types/resume";
import { resumeBackgroundPresets } from "#layers/public-resume/app/mock/resume-display";

/**
 * 背景层：位于所有卡片之下。
 *
 * - `plain` / `texture`：使用纯 CSS / SVG 预设（无依赖）
 * - `image`：使用配置里的 URL（本轮只建模，上传后置）
 * - 遮罩：保证任何背景下正文与卡片仍然可读（深浅主题用不同底色）
 */
const props = defineProps<{
  background: ResumeBackgroundConfig;
  dark: boolean;
}>();

const preset = computed(
  () =>
    resumeBackgroundPresets.find((item) => item.id === props.background.textureId) ??
    resumeBackgroundPresets[0]!,
);

const layerStyle = computed(() => {
  const { background } = props;

  if (background.type === "image" && background.image.url) {
    return {
      backgroundImage: `url(${background.image.url})`,
      backgroundSize: background.image.fit,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }

  if (background.type === "texture" && preset.value.css) {
    return { backgroundImage: preset.value.css, backgroundSize: preset.value.size };
  }

  return {};
});

/** 图片背景时才叠遮罩，纹理背景本身很淡，不需要额外压暗 */
const overlayStyle = computed(() => {
  const opacity = props.background.type === "image" ? props.background.image.overlay / 100 : 0;

  return {
    background: props.dark ? "rgb(3 7 18)" : "rgb(248 250 252)",
    opacity: String(opacity),
  };
});

const blurStyle = computed(() =>
  props.background.type === "image" && props.background.image.blur
    ? { filter: `blur(${props.background.image.blur}px)` }
    : {},
);
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div class="absolute inset-0" :style="{ ...layerStyle, ...blurStyle }" />
    <div class="absolute inset-0" :style="overlayStyle" />
  </div>
</template>
