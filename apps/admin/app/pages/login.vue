<script setup lang="ts">
import type { LoginCredentials } from '../components/auth/LoginForm.vue'

definePageMeta({
  layout: false,
})

const toast = useToast()
const pending = ref(false)
const statusMessage = ref('')

/**
 * 演示登录：暂不接后端 API。
 * 正式接入时，把这里替换为你的 auth mutation（如 useMutation / $fetch 登录接口）。
 */
async function handleSubmit(credentials: LoginCredentials) {
  pending.value = true
  statusMessage.value = ''

  // 模拟一次登录请求耗时，让 loading 态可见。
  await new Promise(resolve => setTimeout(resolve, 600))

  toast.add({
    title: 'Signed in (demo)',
    description: `Welcome back, ${credentials.email}.`,
    color: 'success',
    icon: 'i-lucide-circle-check',
  })

  pending.value = false

  await navigateTo('/')
}
</script>

<template>
  <AuthSplitLayout image-side="right">
    <template #brand>
      <NuxtLink to="/" class="inline-flex items-center gap-3 text-highlighted">
        <span class="grid size-10 place-items-center rounded-2xl bg-primary text-base font-bold text-inverted shadow-sm"
          >A</span
        >
        <span class="text-lg font-semibold tracking-tight">Admin Studio</span>
      </NuxtLink>
    </template>

    <AuthLoginForm :pending="pending" :error="statusMessage" @submit="handleSubmit" />

    <template #image-caption>
      <div class="max-w-sm space-y-3">
        <p class="text-sm font-medium uppercase tracking-[0.18em] text-white/70">Admin workspace</p>
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">A calm place to run the work.</h2>
        <p class="text-sm leading-6 text-white/75">
          Replace this visual with a product image, illustration, or campaign asset through the layout props.
        </p>
      </div>
    </template>
  </AuthSplitLayout>
</template>
