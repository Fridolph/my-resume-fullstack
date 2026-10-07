<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Modal',
})

const toast = useToast()

// —— Confirm 弹窗 ——
const confirmOpen = ref(false)
function handleConfirmDelete() {
  toast.add({
    title: 'Deleted',
    description: 'Project removed (demo).',
    color: 'success',
  })
}

// —— 删除确认（倒计时防误删）——
const deleteConfirmOpen = ref(false)
function handleDeleteConfirm() {
  toast.add({
    title: 'Deleted',
    description: 'Design removed (demo).',
    color: 'success',
  })
}

// —— 响应式对话框 ——
const responsiveOpen = ref(false)

// —— 无权限提示 ——
const forbiddenOpen = ref(false)
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Modal</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      对话框封装：标准确认弹窗 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">ModalConfirm</code>、
      删除确认（倒计时防误删）<code class="rounded bg-elevated px-1.5 py-0.5 text-xs">ModalDeleteConfirm</code>、
      响应式对话框
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">ModalResponsive</code>（桌面 Modal / 移动 Drawer）、
      无权限提示 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">ModalForbidden</code>。
    </p>

    <div class="mt-6 space-y-10">
      <section>
        <h2 class="text-lg font-semibold text-highlighted">Confirm dialog</h2>
        <p class="mt-1 text-sm text-muted">icon + 文案 + 取消/确认按钮，confirm 执行后自动关闭。</p>
        <UButton class="mt-3" label="Open confirm" @click="confirmOpen = true" />

        <ModalConfirm
          v-model:open="confirmOpen"
          title="Delete project?"
          content="This action cannot be undone. The project and its designs will be permanently removed."
          confirm-text="Delete"
          :confirm="handleConfirmDelete"
        />
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Delete confirm (cooldown)</h2>
        <p class="mt-1 text-sm text-muted">
          删除确认弹窗，确认按钮带 N 秒倒计时防误点（
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">cooldown</code>，默认 3，0 关闭）；
          倒计时期间文案显示 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">Delete (n)</code>。
        </p>
        <UButton
          class="mt-3"
          color="error"
          variant="soft"
          label="Open delete confirm"
          @click="deleteConfirmOpen = true"
        />

        <ModalDeleteConfirm
          v-model:open="deleteConfirmOpen"
          title="Delete design?"
          content="This will permanently remove the design and its configuration."
          confirm-text="Delete"
          :cooldown="3"
          :confirm="handleDeleteConfirm"
        />
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Responsive dialog</h2>
        <p class="mt-1 text-sm text-muted">桌面（≥768px）弹出 Modal，移动端滑出 Drawer。</p>
        <UButton class="mt-3" label="Open responsive dialog" @click="responsiveOpen = true" />

        <ModalResponsive
          v-model:open="responsiveOpen"
          title="Responsive dialog"
          description="Resize the window below 768px to see the drawer variant."
        >
          <template #default>
            <p class="text-sm leading-6 text-muted">
              Body content goes here. This area scrolls independently when content grows.
            </p>
          </template>

          <template #footer="{ close }">
            <UButton label="Cancel" color="neutral" variant="outline" @click="close()" />
            <UButton label="Save" @click="close()" />
          </template>
        </ModalResponsive>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Forbidden / notice dialog</h2>
        <p class="mt-1 text-sm text-muted">居中 icon + 提示文案，可点遮罩关闭，适合无权限/受限提示。</p>
        <UButton class="mt-3" label="Open forbidden" @click="forbiddenOpen = true" />

        <ModalForbidden
          v-model:open="forbiddenOpen"
          message="You do not have permission to access this module."
        />
      </section>
    </div>
  </div>
</template>
