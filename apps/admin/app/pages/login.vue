<script setup lang="ts">
import type { LoginCredentials } from '../components/auth/LoginForm.vue'

definePageMeta({
  layout: false,
  // 已登录用户不该停在登录页
  middleware: 'guest',
})

const route = useRoute()
const { signIn } = useAuthState()

const pending = ref(false)
const statusMessage = ref('')

/**
 * 登录后回到"来处"。
 *
 * `auth` 中间件把人踢到 `/login` 时会带上 `?redirect=原路径`，
 * 登录成功后直接回那里，而不是一律丢回首页 —— 否则用户每次都要重新点一遍。
 * 只接受站内绝对路径，避免把 `//evil.com` 这类值当成跳转目标。
 */
const redirectTo = computed(() => {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }

  return '/'
})

/**
 * 用真实账号登录（`POST /api/auth/login`）。
 *
 * 失败信息落在表单的 `error` 区，不飘全局 toast：账号密码这类错误贴着输入框更好读。
 * 身份与权限键由 `useAuthState` 写入，页面不必自己存。
 */
async function handleSubmit(credentials: LoginCredentials) {
  pending.value = true
  statusMessage.value = ''

  const result = await signIn(credentials)
  pending.value = false

  if (!result.ok) {
    statusMessage.value = result.message
    return
  }

  await navigateTo(redirectTo.value)
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
