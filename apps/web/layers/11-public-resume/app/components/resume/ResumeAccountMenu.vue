<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import ResumeAdminLoginModal from './ResumeAdminLoginModal.vue'

/**
 * 身份区（Header 右端，三档里的第三档）—— 见 `docs/dev/identity-and-access.md` §4。
 *
 * - **未登录**：一个「登录」按钮（打开登录弹窗；一个口按账号区分身份）
 * - **已登录**：用户名下拉菜单，菜单项**按权限出现** ——
 *   没有权限的项**不渲染**，而不是渲染成灰的（危险的「重置」尤其不该对无权者可见）。
 *
 * 保存状态也收在这里：它是**状态**不是**操作**，不该在 Header 主位上和按钮抢注意力。
 */
const props = withDefaults(
  defineProps<{
    /** 保存状态文案（由页面传入，来自自动保存策略） */
    saveLabel?: string
    /** 编辑模式开关（只对能编辑的人有意义） */
    editMode?: boolean
  }>(),
  { saveLabel: '', editMode: true },
)

const emit = defineEmits<{ reset: []; 'update:editMode': [value: boolean] }>()

const { user, isAuthed, signOut } = useAuthState()
const { canEditSections, canResetConfig } = usePermission()

const loginOpen = ref(false)

/** 显示名：优先「姓 + 名」，退回邮箱 */
const displayName = computed(() => {
  const info = user.value
  if (!info) {
    return ''
  }

  return `${info.lastName ?? ''}${info.firstName ?? ''}`.trim() || info.email
})

const initial = computed(() => displayName.value.slice(0, 1).toUpperCase() || '?')

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const groups: DropdownMenuItem[][] = []

  // 能编辑的人才会看到"保存状态 + 编辑模式"这一组
  if (canEditSections.value) {
    groups.push([
      { type: 'label', label: props.saveLabel || '改动会自动保存' },
      {
        type: 'checkbox',
        label: '编辑模式',
        checked: props.editMode,
        onUpdateChecked: (checked: boolean) => emit('update:editMode', checked),
      },
    ])
  }

  const tail: DropdownMenuItem[] = []

  if (canResetConfig.value) {
    tail.push({
      label: '重置全部配置…',
      icon: 'i-lucide-rotate-ccw',
      color: 'error',
      onSelect: () => emit('reset'),
    })
  }

  tail.push({ label: '退出登录', icon: 'i-lucide-log-out', onSelect: () => signOut() })
  groups.push(tail)

  return groups
})
</script>

<template>
  <UButton
    v-if="!isAuthed"
    size="xs"
    color="neutral"
    variant="outline"
    icon="i-lucide-log-in"
    label="登录"
    @click="loginOpen = true"
  />

  <UDropdownMenu v-else :items="menuItems" :content="{ align: 'end' }">
    <UButton size="xs" color="neutral" variant="outline" :aria-label="`账户菜单：${displayName}`">
      <span
        class="grid size-4 place-items-center rounded-full text-[0.625rem] font-semibold text-white"
        :style="{ background: 'var(--resume-primary)' }"
      >
        {{ initial }}
      </span>
      <span class="max-w-24 truncate">{{ displayName }}</span>
    </UButton>
  </UDropdownMenu>

  <ResumeAdminLoginModal v-model:open="loginOpen" />
</template>
