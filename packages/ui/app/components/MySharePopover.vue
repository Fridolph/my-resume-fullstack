<script setup lang="ts">
import { renderSVG } from 'uqr'

/**
 * 分享弹层：**复制链接 + 二维码**。
 *
 * ## 为什么它在 `packages/ui` 而不是 `apps/web`
 *
 * 它只描述"能做什么"（把一段 URL 变成可复制/可扫码的分享物），**不认识接口**：
 * 谁来生成链接、有效期怎么定、要不要 AI 开关 —— 全是业务，由调用方通过
 * `#footer` 插槽塞进来。这是 `AGENTS.md` §4.6 的分层判据。
 *
 * ## 二维码为什么用 SVG 而不是 canvas
 *
 * SVG 是纯字符串：**SSR 也能渲染**，不需要 `onMounted` 之后再补画，
 * 也不会在弹层动画里出现"先空白再出现"的一帧。`uqr` 零依赖、体积很小。
 */
const props = defineProps<{
  /**
   * 要分享的完整链接（已含 token）。
   *
   * 为空时组件**不展示复制与二维码**，只渲染 `#create` 插槽 —— 因为"建链"是业务
   * （端点、有效期、权限位），不该由本组件决定。
   */
  url?: string
  /** 正在建链（调用方置位，用于禁用触发按钮与显示加载） */
  generating?: boolean
  copiedText?: string
}>()

/**
 * 弹层关闭。
 *
 * 调用方靠它把"已生成的这条链接"清掉 —— **每次分享都该是一条新链接**。
 * 重开弹层时若还显示上次那条，看起来像"复用了旧链接"（实际是两条，只是界面误导）。
 */
const emit = defineEmits<{ close: [] }>()

const toast = useToast()
const copied = ref(false)

/**
 * 二维码内容。
 *
 * ⚠️ `v-html` 的输入是 **`uqr` 生成的 SVG**，不是用户输入 ——
 * URL 只作为**编码数据**进入二维码，不会被拼进 HTML。
 */
const qrSvg = computed(() => {
  if (!props.url) {
    return ''
  }
  try {
    return renderSVG(props.url, { border: 1 })
  } catch {
    // 链接过长等极端情况：宁可只给复制，也不要抛错把弹层弄崩
    return ''
  }
})

async function copyLink(): Promise<void> {
  if (!props.url || !import.meta.client || !navigator.clipboard) {
    return
  }
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
    toast.add({ title: props.copiedText ?? '链接已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败，请手动选择链接', color: 'error' })
  }
}
</script>

<template>
  <UPopover :content="{ align: 'end' }" @update:open="value => !value && emit('close')">
    <slot name="trigger">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-share-2"
        size="xs"
        :loading="generating"
        aria-label="分享"
      />
    </slot>

    <template #content>
      <div class="flex w-72 flex-col gap-3 p-3">
        <!-- 还没有链接：建链表单由调用方提供 -->
        <slot v-if="!url" name="create" />

        <template v-else>
          <p class="break-all text-sm font-medium">{{ url }}</p>

          <div v-if="qrSvg" class="flex justify-center rounded-md bg-white p-3" v-html="qrSvg" />
          <p v-else class="text-xs text-muted">链接过长，暂不支持二维码，请用复制。</p>

          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            :label="copied ? '已复制' : '复制链接'"
            block
            @click="copyLink"
          />

          <!-- 业务侧的东西（有效期、权限位…）由调用方塞进来 -->
          <slot name="footer" />
        </template>
      </div>
    </template>
  </UPopover>
</template>
