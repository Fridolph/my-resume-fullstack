<script setup lang="ts">
import type { AuthFormField } from '@nuxt/ui'

export interface LoginCredentials {
  /** 用户名或邮箱 —— 后端按是否含 `@` 选择查询字段 */
  account: string
  password: string
}

interface LoginFormProps {
  pending?: boolean
  error?: string
  title?: string
  submitLabel?: string
  forgotPasswordTo?: string
  createAccountTo?: string
}

const props = withDefaults(defineProps<LoginFormProps>(), {
  pending: false,
  error: '',
  title: 'Sign in',
  submitLabel: 'Sign in',
  forgotPasswordTo: '/forgot-password',
  createAccountTo: '/register',
})

const emit = defineEmits<{
  submit: [credentials: LoginCredentials]
}>()

const fields: AuthFormField[] = [
  {
    name: 'account',
    type: 'text',
    label: 'Username or email',
    placeholder: 'super 或 you@example.com',
    leadingIcon: 'i-lucide-user-round',
    size: 'lg',
    required: true,
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter your password',
    leadingIcon: 'i-lucide-lock-keyhole',
    size: 'lg',
    required: true,
  },
]

function handleSubmit(event: { data: LoginCredentials }) {
  emit('submit', event.data)
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :title="title"
    :submit="{ label: submitLabel, size: 'lg', block: true }"
    :loading="pending"
    loading-auto
    :ui="{
      root: 'w-full',
      header: 'text-left',
      title: 'text-3xl font-semibold tracking-tight text-highlighted',
      description: 'text-sm text-muted',
      body: 'gap-y-5',
    }"
    @submit="handleSubmit"
  >
    <template #leading>
      <div class="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted">
        <span class="text-lg" aria-hidden="true">👋</span>
        <span>Welcome back</span>
      </div>
    </template>

    <template #validation>
      <div class="flex items-center justify-between gap-4">
        <ULink :to="forgotPasswordTo" class="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </ULink>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />
    </template>

    <template #footer>
      <p class="text-center text-sm text-muted">
        New here?
        <ULink :to="createAccountTo" class="font-medium text-primary hover:underline"> Create an account </ULink>
      </p>
    </template>
  </UAuthForm>
</template>
