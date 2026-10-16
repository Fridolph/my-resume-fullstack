<script setup lang="ts">
/**
 * 登录表单通过后端认证，编辑资格由会话权限和接口共同校验。
 */
const open = defineModel<boolean>('open', { default: false })
const { signIn } = useAuthState()

const form = reactive({ username: '', password: '' })
const errorMessage = ref('')
const pending = ref(false)

async function submit() {
  if (pending.value) return
  pending.value = true
  const result = await signIn({ username: form.username, password: form.password })
  pending.value = false

  if (!result.ok) {
    errorMessage.value = result.message
    return
  }

  errorMessage.value = ''
  form.password = ''
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="登录">
    <template #body>
      <div class="space-y-4">
        <UFormField label="账号" name="username">
          <UInput v-model="form.username" placeholder="用户名或邮箱" autocomplete="username" class="w-full" />
        </UFormField>

        <UFormField label="密码" name="password">
          <UInput
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            class="w-full"
            @keyup.enter="submit"
          />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-error">
          {{ errorMessage }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="取消" @click="open = false" />
        <UButton icon="i-lucide-log-in" label="登录" :loading="pending" @click="submit" />
      </div>
    </template>
  </UModal>
</template>
