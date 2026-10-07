<script setup lang="ts">
import { useResumeAdmin } from '../../composables/useResumeAdmin'

/**
 * 管理员登录弹窗（**本地 mock**）。
 *
 * 弹窗自己声明清楚"这不是鉴权"，避免后来者误以为这里提供了保护。
 */
const open = defineModel<boolean>('open', { default: false })
const { signIn, mockHint } = useResumeAdmin()

const form = reactive({ username: '', password: '' })
const errorMessage = ref('')

function submit() {
  const result = signIn({ username: form.username, password: form.password })

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
  <UModal v-model:open="open" title="管理员登录">
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="本地 mock 登录，不是鉴权"
          :description="`${mockHint}。账号密码写在前端、任何人可绕过，仅用于把「登录 → 编辑 → 保存」这条流程跑通。接入后端 auth 后会替换掉这里。`"
        />

        <UFormField label="账号" name="username">
          <UInput v-model="form.username" placeholder="admin" class="w-full" />
        </UFormField>

        <UFormField label="密码" name="password">
          <UInput v-model="form.password" type="password" class="w-full" @keyup.enter="submit" />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-error">
          {{ errorMessage }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="取消" @click="open = false" />
        <UButton icon="i-lucide-log-in" label="登录" @click="submit" />
      </div>
    </template>
  </UModal>
</template>
