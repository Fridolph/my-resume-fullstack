<script setup lang="ts">
import { EventType, Rive } from '@rive-app/webgl2'
import { useWindowSize } from '@vueuse/core'
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'

/**
 * `NuxtRive` —— Rive 运行时的**客户端**封装（`.client.vue` 后缀保证只在浏览器执行）。
 *
 * ## 它到底解决了什么
 *
 * Rive 的 `new Rive({ canvas, src, ... })` 是**命令式**的：得自己管 canvas 尺寸、自己订阅事件、
 * 自己销毁。这个组件把这些收成声明式用法：
 *
 * - 传入 `riveParams`（`src` / `stateMachines` / `layout` …）即可播放；
 * - 容器尺寸变化时自动重设 canvas（含 DPR 处理，避免高分屏发虚）；
 * - 把 Rive 的事件转发成 Vue 事件（`@rive-is-loaded` 等），
 *   从而拿到**实例**去做进一步操作（如设置状态机输入，见 `useStateMachineInput`）；
 * - 卸载时 `stopRendering` + `cleanup`，避免 canvas / WebGL 上下文泄漏。
 *
 * ## 为什么必须客户端渲染
 *
 * Rive 依赖 canvas 与 WebGL，服务端没有这些 —— 但**不能直接 `v-if` 掉**，
 * 那样首屏会闪。所以用 Nuxt 的 `.client` 后缀（配合调用方的 `<ClientOnly>` 给占位），
 * 让服务端渲染出容器、浏览器再补上动画。
 */
const props = withDefaults(
  defineProps<{
    /** 透传给 `new Rive(...)` 的参数（`src` / `autoplay` / `layout` / `stateMachines` …） */
    riveParams?: Record<string, unknown> | null
    /** 渲染选项：`useDevicePixelRatio` / `fitCanvasToArtboardHeight` / `useOffscreenRenderer` */
    options?: Record<string, unknown>
    /** 文本替换（Rive 的 text run），用于把文案交给代码控制 */
    textRuns?: Record<string, string>
  }>(),
  { riveParams: null, options: undefined, textRuns: undefined },
)

const emit = defineEmits<{
  /** Rive 加载完成，携带实例 —— 设置状态机输入通常在这里做 */
  riveIsLoaded: [rive: unknown]
  play: [event: unknown]
  pause: [event: unknown]
  stop: [event: unknown]
  loop: [event: unknown]
  statechange: [event: unknown]
}>()
const canvas = ref<HTMLCanvasElement | null>(null)
const container = ref<HTMLElement | null>(null)
const { width: wWidth, height: wHeight } = useWindowSize()
const riveIsLoaded = ref(false)
/** Rive 实例；`any` 是因为 @rive-app/webgl2 的实例类型未完整导出 */
let RiveInstance: any = null
const dimensions = ref({ width: 0, height: 0 })
const containerStyle = ref<Record<string, string>>({})
const canvasStyle = ref<Record<string, string>>({})
const canvasSize = ref({ width: 0, height: 0 })
const animations = computed(() => {
  return props.riveParams?.animations
})

const defaultOptions = {
  useDevicePixelRatio: true,
  fitCanvasToArtboardHeight: false,
  useOffscreenRenderer: true,
}
const options = computed(() => {
  return Object.assign({}, defaultOptions, props.options)
})

watchEffect(() => {
  if (canvas.value && container.value && wWidth.value && wHeight.value) {
    const { width, height } = getCanvasDimensions()
    const boundsChanged = width !== dimensions.value.width || height !== dimensions.value.height
    if (canvas.value && container.value && riveIsLoaded.value && boundsChanged) {
      if (options.value.fitCanvasToArtboardHeight) {
        containerStyle.value = { height: `${height}px` }
      }
      if (options.value.useDevicePixelRatio) {
        const dpr = window.devicePixelRatio || 1
        canvasSize.value = {
          width: dpr * width,
          height: dpr * height,
        }
        canvasStyle.value = {
          width: `${width}px`,
          height: `${height}px`,
        }
      } else {
        canvasSize.value = { width, height }
        canvasStyle.value = {}
      }
      dimensions.value = { width, height }
      if (RiveInstance) {
        RiveInstance.startRendering()
        RiveInstance.resizeToCanvas()
      }
    }
  }
})
watch(animations, () => {
  if (RiveInstance && animations.value) {
    RiveInstance.stop(RiveInstance.animationNames)
    RiveInstance.play(animations.value)
  }
})
watch(
  () => props.textRuns,
  newTextRuns => {
    if (RiveInstance && newTextRuns) {
      for (const [runName, value] of Object.entries(newTextRuns)) {
        try {
          RiveInstance.setTextRunValue(runName, value)
        } catch (e) {
          console.warn(`[nuxt-rive] Failed to set text run "${runName}":`, e)
        }
      }
    }
  },
  { deep: true },
)
function getCanvasDimensions() {
  const { width, height } = container.value?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0)
  if (RiveInstance && options.value.fitCanvasToArtboardHeight) {
    const { maxY, maxX } = RiveInstance.bounds
    return { width, height: width * (maxY / maxX) }
  }
  return { width, height }
}
onMounted(() => {
  nextTick(() => {
    if (canvas.value) {
      const { useOffscreenRenderer } = options.value
      const r = new Rive({
        useOffscreenRenderer,
        ...props.riveParams,
        canvas: canvas.value,
      })
      r.on(EventType.Load, () => {
        RiveInstance = r
        riveIsLoaded.value = true
        if (props.textRuns) {
          for (const [runName, value] of Object.entries(props.textRuns)) {
            try {
              r.setTextRunValue(runName, value)
            } catch (e) {
              console.warn(`[nuxt-rive] Failed to set text run "${runName}":`, e)
            }
          }
        }
        emit('riveIsLoaded', r)
      })
      r.on(EventType.Play, event => emit('play', event))
      r.on(EventType.Pause, event => emit('pause', event))
      r.on(EventType.Stop, event => emit('stop', event))
      r.on(EventType.Loop, event => emit('loop', event))
      r.on(EventType.StateChange, event => emit('statechange', event))
    }
  })
})
onUnmounted(() => {
  if (RiveInstance) {
    RiveInstance.stopRendering()
    if (RiveInstance.cleanup) {
      RiveInstance.cleanup()
    }
    RiveInstance = null
  }
})
defineExpose({
  RiveInstance,
})
</script>

<template>
  <div ref="container" :style="containerStyle">
    <canvas
      ref="canvas"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :style="[{ verticalAlign: 'top' }, canvasStyle]"
    />
  </div>
</template>
