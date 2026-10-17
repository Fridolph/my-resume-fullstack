<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Permission wrapper',
})

const { permissionKeys, setPermissionKeys } = usePermission()

const allPermissions = ['project.read', 'project.create', 'project.delete', 'team.manage']

const grantedKeys = computed(() => new Set(permissionKeys.value))

function toggle(key: string) {
  const next = new Set(permissionKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  setPermissionKeys([...next])
}

function grantAll() {
  setPermissionKeys([...allPermissions])
}

function revokeAll() {
  setPermissionKeys([])
}

/**
 * 这一页要演示"权限变了、内容跟着变"，必然要动**全局**权限态（`PermissionWrapper` 读的就是它）。
 *
 * 但它是个 demo：**离开时必须还原**。否则从这页点去别的页面，权限已经是被改过的样子 ——
 * 权限守卫改成 fail-closed 之后，`revokeAll()` 甚至能把当前会话"锁"在后台外面。
 * 做法是进入时快照、卸载时恢复（而不是"进页时补一个权限"那种会越界的手）。
 */
const permissionSnapshot = ref<string[] | null>(null)

onMounted(() => {
  permissionSnapshot.value = [...permissionKeys.value]
  if (!permissionKeys.value.length) setPermissionKeys(['project.read'])
})

onBeforeUnmount(() => {
  if (permissionSnapshot.value) setPermissionKeys(permissionSnapshot.value)
})
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Permission wrapper</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      按权限显隐内容。
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">PermissionWrapper</code> 依据
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">permissions</code> 与当前用户权限（
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">usePermission()</code>）决定是否渲染默认插槽。
      点下面的开关增减权限，观察下方示例显隐。
    </p>

    <section class="mt-6">
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="key in allPermissions"
          :key="key"
          :label="key"
          size="sm"
          :color="grantedKeys.has(key) ? 'primary' : 'neutral'"
          :variant="grantedKeys.has(key) ? 'solid' : 'outline'"
          :icon="grantedKeys.has(key) ? 'i-lucide-check' : 'i-lucide-plus'"
          @click="toggle(key)"
        />
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          label="Grant all"
          icon="i-lucide-check-check"
          @click="grantAll"
        />
        <UButton size="sm" color="neutral" variant="soft" label="Revoke all" icon="i-lucide-x" @click="revokeAll" />
      </div>

      <p class="mt-3 text-sm text-muted">
        Current keys:
        <code v-if="permissionKeys.length" class="rounded bg-elevated px-1.5 py-0.5 text-xs">{{
          permissionKeys.join(', ')
        }}</code>
        <span v-else class="text-dimmed">（空）</span>
      </p>
    </section>

    <div class="mt-6 space-y-6">
      <section>
        <h2 class="text-lg font-semibold text-highlighted">
          No <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">permissions</code> prop
        </h2>
        <p class="mt-1 text-sm text-muted">
          不传 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">permissions</code> → 始终显示。
        </p>
        <div class="mt-3">
          <PermissionWrapper>
            <UCard>
              <p class="text-sm text-muted">Always visible — this card renders for every user.</p>
            </UCard>
          </PermissionWrapper>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Single permission</h2>
        <p class="mt-1 text-sm text-muted">
          需要 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">project.read</code>。
        </p>
        <div class="mt-3">
          <PermissionWrapper permissions="project.read">
            <UCard>
              <p class="text-sm text-muted">
                Visible only when the user has
                <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">project.read</code>.
              </p>
            </UCard>
          </PermissionWrapper>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Multiple permissions (AND)</h2>
        <p class="mt-1 text-sm text-muted">
          数组要求 <strong>全部</strong> 满足：
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">project.read</code> +
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">project.create</code>。
        </p>
        <div class="mt-3">
          <PermissionWrapper :permissions="['project.read', 'project.create']">
            <UCard>
              <p class="text-sm text-muted">Visible only when the user has <strong>both</strong> permissions.</p>
            </UCard>
          </PermissionWrapper>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Gate an action</h2>
        <p class="mt-1 text-sm text-muted">
          用权限包裹危险操作按钮：只有
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">project.delete</code> 才显示 Delete。
        </p>
        <UCard class="mt-3">
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm text-muted">Project settings</span>
            <div class="flex items-center gap-2">
              <UButton color="neutral" variant="outline" label="Edit" icon="i-lucide-pencil" />
              <PermissionWrapper permissions="project.delete">
                <UButton color="error" variant="soft" label="Delete" icon="i-lucide-trash-2" />
              </PermissionWrapper>
            </div>
          </div>
        </UCard>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Scoped slot</h2>
        <p class="mt-1 text-sm text-muted">
          默认插槽暴露
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">permission-keys</code> /
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">has-permission</code>。
        </p>
        <div class="mt-3">
          <PermissionWrapper permissions="team.manage">
            <template #default="{ permissionKeys: keys, hasPermission: has }">
              <UCard>
                <p class="text-sm text-muted">keys: {{ keys.join(', ') || '—' }}</p>
                <p class="mt-1 text-sm text-muted">hasPermission('team.manage'): {{ has('team.manage') }}</p>
              </UCard>
            </template>
          </PermissionWrapper>
        </div>
      </section>
    </div>
  </div>
</template>
