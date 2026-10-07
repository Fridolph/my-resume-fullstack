<script setup lang="ts">
/**
 * LoadersColorSpin —— 彩色旋转加载指示器（参考 greensketch loaders/ColorSpin.vue）
 * 用法：放在 `relative` 容器内居中显示，`size` 控制直径（默认 64px）。
 * 适合整块区域加载 / 全屏遮罩加载；内容级骨架屏后续用 LoadersSkeleton。
 */
withDefaults(defineProps<{
  size?: number
}>(), {
  size: 64,
})
</script>

<template>
  <div class="color-spin-loader" :style="{ height: `${size}px`, width: `${size}px` }">
    <span />
    <span />
    <span />
    <span />
  </div>
</template>

<style scoped>
/* From Uiverse.io by terenceodonoghue */
.color-spin-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  animation: rotate_3922 1.2s linear infinite;
  background-color: #9b59b6;
  background-image: linear-gradient(#9b59b6, #84cdfa, #5ad1cd);
}

.color-spin-loader span {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-color: #9b59b6;
  background-image: linear-gradient(#00e944, #06f, #18f0b6);
}

.color-spin-loader span:nth-of-type(1) {
  filter: blur(2px);
}

.color-spin-loader span:nth-of-type(2) {
  filter: blur(10px);
}

.color-spin-loader span:nth-of-type(3) {
  filter: blur(25px);
}

.color-spin-loader span:nth-of-type(4) {
  filter: blur(50px);
}

.color-spin-loader::after {
  content: "";
  position: absolute;
  inset: 10px;
  background-color: #fff;
  border: 5px solid #fff;
  border-radius: 50%;
}

@keyframes rotate_3922 {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
