<script setup lang="ts">
import { normalizeApiError } from '@rs/common'
import { uploadFiles } from '~/apis/files'
import { createUserApi, type MyProfile } from '#layers/settings/app/apis/user'

/**
 * 我的资料。
 *
 * ## 为什么单独一页而不是塞进 settings/company
 *
 * 这一页改的是**账号本身**（用户名/邮箱/手机/头像），而 company 那类是项目配置。
 * 混在一起会让"改个昵称"也要求配置权限，权限面就错了。
 *
 * ## 错误处理的分工
 *
 * - 客户端只做**体验**（必填、长度）
 * - 服务端才是**边界**：用户名 / 邮箱 / 手机都带 `@unique`，冲突由全局 Filter 把
 *   P2002 转成 409。这里把 409 的提示**挂到对应字段**上，而不是弹一个笼统的 toast ——
 *   用户得知道是哪一栏出了问题。
 */
definePageMeta({ middleware: ['auth'], title: '我的资料' })

const api = createUserApi()
const toast = useToast()

const { data: profile, refresh } = await useAsyncData('admin:user:me', () => api.getMe())

const form = reactive({
  username: '',
  nickname: '',
  email: '',
  phone: '',
})

/** 服务端回来之后把表单填上；`refresh` 之后也要重填，所以用 watch 而不是一次性赋值 */
watch(
  profile,
  (value: MyProfile | null | undefined) => {
    if (!value) {
      return
    }
    form.username = value.username ?? ''
    form.nickname = value.nickname ?? ''
    form.email = value.email ?? ''
    form.phone = value.phone ?? ''
  },
  { immediate: true },
)

const saving = ref(false)
/** 字段级错误：409 的重复冲突挂到对应栏位 */
const fieldErrors = reactive<Record<string, string>>({})

function clearErrors(): void {
  for (const key of Object.keys(fieldErrors)) {
    delete fieldErrors[key]
  }
}

/**
 * 把服务端的冲突信息**落到字段**上。
 *
 * 服务端只给一句"唯一约束冲突"，具体是哪一列要看 message 里的字段名 ——
 * 与其在服务端加一个专门的结构，不如在这里按关键词归类：
 * 这是**展示层**的职责，而且关键词表很小、很稳定（username/email/phone）。
 */
function mapServerError(problem: unknown): void {
  const normalized = normalizeApiError(problem)
  const text = `${normalized.message}`.toLowerCase()

  if (normalized.code === 409) {
    if (text.includes('email') || text.includes('邮箱')) fieldErrors.email = '该邮箱已被占用'
    else if (text.includes('phone') || text.includes('手机')) fieldErrors.phone = '该手机号已被占用'
    else if (text.includes('username') || text.includes('用户名')) fieldErrors.username = '该用户名已被占用'
    else fieldErrors.username = '与已有账号重复'
    return
  }

  toast.add({ title: '保存失败', description: normalized.message, color: 'error' })
}

async function save(): Promise<void> {
  if (saving.value) {
    return
  }
  clearErrors()
  saving.value = true
  try {
    await api.updateMe({
      username: form.username.trim() || undefined,
      nickname: form.nickname.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    })
    toast.add({ title: '资料已保存', color: 'success' })
    await refresh()
  } catch (problem) {
    mapServerError(problem)
  } finally {
    saving.value = false
  }
}

// ── 头像 ────────────────────────────────────────────────────────────
const avatarUploading = ref(false)
/** `UFileUpload` 的单选 v-model */
const avatarFiles = ref<File | null>(null)

/**
 * 选中即上传，成功后**直接把新地址写回账号**（替换原头像）。
 *
 * 上传走通用接口（`POST /api/upload/files` + `purpose=avatar`），
 * 它本来就是为了"不同用途传不同目录"设计的 —— 不为头像另开一个端点。
 */
async function onAvatarPicked(value: File | null | undefined): Promise<void> {
  const file = value
  if (!file) {
    return
  }
  avatarUploading.value = true
  try {
    const [uploaded] = await uploadFiles(file, { purpose: 'avatar' })
    if (!uploaded) {
      throw new Error('上传没有返回文件')
    }
    // `originalFilePath` 是服务端返回的公开 URL（新旧命名的历史包袱，见 apis/files.ts）
    await api.updateMe({ avatar: uploaded.originalFilePath })
    toast.add({ title: '头像已更新', color: 'success' })
    await refresh()
  } catch (problem) {
    toast.add({ title: '头像上传失败', description: normalizeApiError(problem).message, color: 'error' })
  } finally {
    avatarUploading.value = false
    avatarFiles.value = null
  }
}

const displayName = computed(
  () => profile.value?.nickname || profile.value?.username || profile.value?.email || '未命名用户',
)
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-highlighted">我的资料</h1>
      <p class="mt-2 text-sm text-muted">头像、用户名、邮箱与手机号。用户名 / 邮箱 / 手机号在系统内唯一。</p>
    </div>

    <UCard>
      <div class="flex flex-wrap items-center gap-4">
        <UAvatar :src="profile?.avatar ?? undefined" :alt="displayName" size="3xl" />
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <p class="truncate text-sm font-medium text-highlighted">{{ displayName }}</p>
          <UFileUpload
            v-model="avatarFiles"
            accept="image/png,image/jpeg"
            :disabled="avatarUploading"
            :loading="avatarUploading"
            label="点击或拖入图片以更换头像"
            hint="支持 PNG / JPEG"
            class="w-full max-w-sm"
            @update:model-value="onAvatarPicked"
          />
        </div>
      </div>
    </UCard>

    <UCard>
      <UForm :state="form" class="flex flex-col gap-4" @submit="save">
        <UFormField label="用户名" name="username" :error="fieldErrors.username" hint="3–32 位，中文/字母/数字/下划线">
          <UInput v-model="form.username" placeholder="例如：yuying" class="w-full" />
        </UFormField>

        <UFormField label="昵称" name="nickname" :error="fieldErrors.nickname" hint="留空则显示用户名">
          <UInput v-model="form.nickname" placeholder="例如：阿英" class="w-full" />
        </UFormField>

        <UFormField label="邮箱" name="email" :error="fieldErrors.email">
          <UInput v-model="form.email" type="email" placeholder="you@example.com" class="w-full" />
        </UFormField>

        <UFormField label="手机号" name="phone" :error="fieldErrors.phone">
          <UInput v-model="form.phone" placeholder="例如：13800138000" class="w-full" />
        </UFormField>

        <div class="flex justify-end">
          <UButton type="submit" :loading="saving" label="保存" />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
