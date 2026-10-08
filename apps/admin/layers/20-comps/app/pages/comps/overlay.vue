<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Overlay（共享浮层）',
})

/**
 * 共享浮层组件示例（来自 packages/ui）
 *
 * 覆盖：基础抽屉 / 方向与尺寸 / 自定义 header + footer / 内置动作区（异步确认）/ AppModal 的响应式退化。
 */
const toast = useToast()

const basicOpen = ref(false)

const directionOpen = ref(false)
const direction = ref<'top' | 'right' | 'bottom' | 'left'>('right')
const size = ref<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md')

const customOpen = ref(false)

const actionsOpen = ref(false)
const saving = ref(false)
async function submit() {
  saving.value = true
  await new Promise(resolve => setTimeout(resolve, 1200))
  saving.value = false
  actionsOpen.value = false
  toast.add({
    title: '已保存',
    description: '示例：异步提交成功后才关闭（close-on-confirm=false）',
    color: 'success',
  })
}

const modalOpen = ref(false)

const DIRECTIONS = ['right', 'left', 'top', 'bottom'] as const
const SIZES = ['sm', 'md', 'lg', 'xl', 'full'] as const
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Overlay（共享浮层）</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      来自
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">packages/ui</code>
      的两个共享组件：
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">AppDrawer</code>（抽屉）与
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">AppModal</code>
      （桌面对话框 / 窄屏自动退化为抽屉）。两者共用同一套 slot 契约：
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs"
        >trigger / 默认(body) / header / title / description / actions / close / footer</code
      >。
    </p>

    <div class="mt-6 space-y-10">
      <section>
        <h2 class="text-lg font-semibold text-highlighted">基础抽屉</h2>
        <p class="mt-1 text-sm text-muted">
          trigger 槽放触发按钮，正文走默认槽；点遮罩 / Esc / 滑动都会触发同一个
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">close</code>
          事件（且只触发一次）。
        </p>

        <AppDrawer v-model:open="basicOpen" title="基础抽屉" description="右侧滑出，默认 md 宽度">
          <template #trigger>
            <UButton class="mt-3" label="打开基础抽屉" />
          </template>

          <p class="text-sm leading-6 text-muted">这里是正文。内容变长时只有这一段滚动，头尾保持固定。</p>
          <p class="mt-3 text-sm leading-6 text-muted">
            面板只在打开时才渲染，所以 SSR 首屏里不会出现浮层，也不需要外挂 ClientOnly。
          </p>
        </AppDrawer>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">方向与尺寸</h2>
        <p class="mt-1 text-sm text-muted">
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">direction</code>
          决定从哪一侧滑出；
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">size</code>
          对侧边抽屉是宽度、对上下抽屉是高度。
        </p>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UButton
            v-for="d in DIRECTIONS"
            :key="d"
            size="xs"
            :variant="direction === d ? 'solid' : 'outline'"
            :label="d"
            @click="direction = d"
          />
          <span class="bg-border mx-1 h-4 w-px" />
          <UButton
            v-for="s in SIZES"
            :key="s"
            size="xs"
            :variant="size === s ? 'solid' : 'outline'"
            :label="s"
            @click="size = s"
          />
        </div>

        <AppDrawer
          v-model:open="directionOpen"
          :direction="direction"
          :size="size"
          title="方向与尺寸"
          :description="`direction = ${direction} · size = ${size}`"
        >
          <template #trigger>
            <UButton class="mt-3" color="neutral" variant="outline" label="按当前配置打开" />
          </template>

          <p class="text-sm leading-6 text-muted">改上面的按钮再打开，观察抽屉从哪一侧滑出、占多宽（或高）。</p>
        </AppDrawer>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">自定义 header / footer</h2>
        <p class="mt-1 text-sm text-muted">
          给了
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">#header</code> /
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">#footer</code>
          就完全接管这两块，不再渲染内置动作区。
        </p>

        <AppDrawer v-model:open="customOpen" title="自定义槽位">
          <template #trigger>
            <UButton class="mt-3" label="自定义 header / footer" />
          </template>

          <template #header="{ close }">
            <div class="flex w-full items-center justify-between gap-2">
              <span class="text-sm font-semibold text-highlighted">自定义 Header</span>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" aria-label="关闭" @click="close()" />
            </div>
          </template>

          <p class="text-sm leading-6 text-muted">
            槽位收到的 props 里带
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">close</code> /
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">confirm</code> /
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">cancel</code>，不用自己拼状态。
          </p>

          <template #footer="{ cancel, confirm }">
            <div class="flex w-full items-center justify-between gap-2">
              <span class="text-muted text-xs">左侧可以放状态文案</span>
              <div class="flex gap-2">
                <UButton color="neutral" variant="ghost" label="取消" @click="cancel" />
                <UButton label="确定" @click="confirm" />
              </div>
            </div>
          </template>
        </AppDrawer>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">内置动作区（异步确认）</h2>
        <p class="mt-1 text-sm text-muted">
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">show-actions</code> 渲染「取消 / 确认 + footerText」；
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">loading</code> 挂到确认按钮上；
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">close-on-confirm=false</code>
          用于"提交成功后才关"。
        </p>

        <AppDrawer
          v-model:open="actionsOpen"
          title="内置动作区"
          description="show-actions · loading · close-on-confirm=false"
          footer-text="异步提交示例"
          show-actions
          :loading="saving"
          :close-on-confirm="false"
          confirm-text="保存"
          cancel-text="先不保存"
          @confirm="submit"
        >
          <template #trigger>
            <UButton class="mt-3" label="内置动作区（异步）" />
          </template>

          <p class="text-sm leading-6 text-muted">
            点「保存」会 loading 1.2 秒，成功后才关闭 —— 关不关由调用方决定，组件不抢这个决定权。
          </p>
        </AppDrawer>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">AppModal（响应式退化）</h2>
        <p class="mt-1 text-sm text-muted">
          ≥ 768px 用
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">UModal</code>；&lt; 768px 退化为底部抽屉。
          把窗口拖窄（或用 DevTools 设备模式）再打开即可看到。
        </p>

        <AppModal
          v-model:open="modalOpen"
          title="响应式对话框"
          description="≥768px 是 UModal；<768px 是底部抽屉"
          footer-text="拖动窗口宽度试试"
          show-actions
          confirm-text="知道了"
        >
          <template #trigger>
            <UButton class="mt-3" color="neutral" variant="outline" label="打开 AppModal" />
          </template>

          <p class="text-sm leading-6 text-muted">
            移动端用抽屉是为了键盘友好：输入时底部抽屉不会被键盘顶掉，也能用拇指够到动作区。
          </p>
        </AppModal>
      </section>
    </div>
  </div>
</template>
