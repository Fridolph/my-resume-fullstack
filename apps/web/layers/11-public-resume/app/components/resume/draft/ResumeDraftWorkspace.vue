<script setup lang="ts">
import type { CapabilitySection, CapabilityView } from '@rs/common'
import { useResumeDraft } from '#layers/public-resume/app/composables/useResumeDraft'
import { createDemoResumeDocument, importResumeDocument } from '#layers/public-resume/app/utils/resume-document'
import { capabilitySample } from '#layers/public-resume/app/config/capability-sample'
import { useResumeContent } from '#layers/public-resume/app/composables/useResumeContent'
import { useResumeDisplay } from '#layers/public-resume/app/composables/useResumeDisplay'
import ResumeAdminLoginModal from '../ResumeAdminLoginModal.vue'
import CapabilityEditor from '../capabilities/CapabilityEditor.vue'
import ResumeDraftPreview from './ResumeDraftPreview.vue'
import ResumeDraftArrangement from './ResumeDraftArrangement.vue'
const { draft, document, status, error, staleNotice, dirty, canEdit, reauthRequired, create, load, save, backup } =
  useResumeDraft()
const { isAuthed, restoreError, hydrate, signOut } = useAuthState()
const { content: legacyContent, loadLocal: loadContent } = useResumeContent()
const { config: legacyDisplay, loadLocal: loadDisplay } = useResumeDisplay()
const loginOpen = ref(false)
const editorOpen = ref(false)
const selectedId = ref('')
const resumeId = ref('')
const name = ref('我的求职简历')
const importError = ref('')
const previewOnly = ref(false)
function logout() {
  if (!dirty.value || window.confirm('仍有未保存修改，建议先导出备份。是否退出登录？')) signOut()
}
const selected = computed(
  () =>
    document.value?.content.sections.find(
      section => section.id === selectedId.value && section.type === 'capabilities',
    ) as CapabilitySection | undefined,
)
const view = computed<CapabilityView | undefined>(() =>
  selected.value ? document.value?.display.sections.overrides[selected.value.id]?.capabilities : undefined,
)
const labels = {
  idle: '尚未打开草稿',
  loading: '读取中…',
  pending: '有待保存修改',
  saving: '保存中…',
  saved: '已保存',
  error: '保存或读取失败',
  conflict: '版本冲突 · 请先备份',
}
async function createDraft(importLocal = false) {
  importError.value = ''
  try {
    if (importLocal) {
      loadContent()
      loadDisplay()
    }
    const initial = importLocal
      ? importResumeDocument(legacyContent.value, legacyDisplay.value)
      : createDemoResumeDocument(capabilitySample)
    await create(name.value, initial)
  } catch {
    importError.value = '本地内容格式无法转换，请保留原始内容并检查图片网址、字段长度和日期。'
  }
}
function open(id: string) {
  if (!document.value) return
  const section = document.value.content.sections.find(item => item.id === id && item.type === 'capabilities')
  if (!section || section.type !== 'capabilities') return
  if (!document.value.display.sections.overrides[id]?.capabilities) {
    document.value.display.sections.overrides[id] = {
      capabilities: { view: 'text', dimensionIds: section.data.dimensions.map(item => item.id), previewItemCount: 3 },
    }
  }
  selectedId.value = id
  editorOpen.value = true
}
function reload() {
  if (draft.value && (!dirty.value || window.confirm('重新读取会覆盖本地未保存内容。请先导出备份，是否继续？')))
    void load(String(draft.value.resume.id))
}
function openId() {
  if (resumeId.value && (!dirty.value || window.confirm('仍有未保存内容，是否切换草稿？'))) void load(resumeId.value)
}
</script>

<template>
  <main class="mx-auto max-w-6xl space-y-6 px-4 py-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">我的简历草稿</h1>
        <p class="mt-1 text-sm text-muted">围绕目标岗位组织能力，修改将在停顿 2.5 秒后保存。</p>
      </div>
      <div class="flex items-center gap-3">
        <NuxtLink to="/resume" class="text-sm underline">查看公开演示</NuxtLink>
        <UButton v-if="isAuthed" label="退出登录" color="neutral" variant="ghost" @click="logout" />
      </div>
    </header>
    <div v-if="!isAuthed" class="rounded-xl border p-5">
      <p>登录后读取和编辑本人草稿。</p>
      <p v-if="restoreError" class="my-2 text-error">{{ restoreError }}</p>
      <div class="mt-3 flex gap-2">
        <UButton label="登录" @click="loginOpen = true" /><UButton
          v-if="restoreError"
          label="重试会话恢复"
          color="neutral"
          @click="hydrate"
        />
      </div>
    </div>
    <template v-else>
      <p v-if="!canEdit" class="text-sm text-muted">当前账号仅可读取本人草稿；编辑需管理员角色及简历编辑权限。</p>
      <div v-if="reauthRequired" class="flex flex-wrap items-center gap-3 rounded border p-3 text-sm">
        <span>会话失效。请先备份当前输入，再用同一账号登录并手动重试；切换账号会清除工作副本。</span>
        <UButton label="重新登录" @click="loginOpen = true" />
      </div>
      <section class="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <label class="grid gap-1 text-sm"
          >草稿 ID<input
            v-model="resumeId"
            class="max-w-full rounded border p-2"
            placeholder="输入本人草稿 ID" /></label
        ><UButton
          label="读取草稿"
          color="neutral"
          :disabled="status === 'loading' || status === 'saving'"
          @click="openId"
        />
        <template v-if="canEdit && !document"
          ><label class="grid gap-1 text-sm"
            >内部名称<input v-model="name" maxlength="80" class="rounded border p-2" /></label
          ><UButton label="从真实能力样本创建" :disabled="status === 'loading'" @click="createDraft()" /><UButton
            label="导入当前本地简历"
            color="neutral"
            variant="outline"
            :disabled="status === 'loading'"
            @click="createDraft(true)"
        /></template>
      </section>
      <p v-if="importError" role="alert" class="text-error">{{ importError }}</p>
      <section class="flex flex-wrap items-center gap-3" aria-live="polite">
        <span class="text-sm">{{ labels[status] }}</span
        ><span v-if="draft" class="break-all text-xs text-muted"
          >{{ draft.resume.name }} · {{ draft.resume.id }} · revision {{ draft.revision }}</span
        ><UButton v-if="document" label="导出备份" color="neutral" variant="outline" @click="backup" /><UButton
          v-if="canEdit && document"
          label="立即保存 / 重试"
          :disabled="!dirty || status === 'saving' || status === 'conflict'"
          @click="save"
        /><UButton
          v-if="draft"
          label="重新读取"
          color="neutral"
          variant="outline"
          :disabled="status === 'saving'"
          @click="reload"
        />
      </section>
      <!-- 本地旧记录失效：不是错误，提示后用户可直接创建（详见 useResumeDraft 的 load()） -->
      <p v-if="staleNotice" role="status" class="mt-3 rounded border border-default bg-elevated p-3 text-sm text-muted">
        {{ staleNotice }}
      </p>
      <p v-if="error" role="alert" class="rounded border border-error p-3 text-error">
        {{ error }}。当前输入保留，可先导出备份。
      </p>
      <template v-if="document">
        <section class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm"
            >展示风格<select
              v-model="document.display.style.id"
              :disabled="!canEdit || status === 'loading'"
              class="rounded border p-2"
            >
              <option value="minimal">极简</option>
              <option value="standard">标准</option>
              <option value="pro">精致</option>
            </select></label
          ><UButton
            v-if="canEdit"
            :label="previewOnly ? '回到编辑' : '读者预览'"
            color="neutral"
            variant="outline"
            @click="previewOnly = !previewOnly"
          />
        </section>
        <ResumeDraftArrangement
          v-if="canEdit && !previewOnly && status !== 'loading'"
          v-model="document"
          @edit="open"
        />
        <ResumeDraftPreview :document="document" />
      </template>
    </template>
    <ResumeAdminLoginModal v-model:open="loginOpen" />
    <UModal
      v-model:open="editorOpen"
      title="编辑个人能力"
      description="修改自动保存；无效输入与冲突会保留本地内容。"
      :ui="{ content: 'max-w-3xl' }"
      ><template #body
        ><CapabilityEditor
          v-if="canEdit && selected && view"
          :section="selected"
          :view="view"
          @update:section="Object.assign(selected, $event)"
          @update:view="document!.display.sections.overrides[selected!.id] = { capabilities: $event }" /></template
      ><template #footer
        ><span class="mr-auto text-xs">{{ labels[status] }}</span
        ><UButton label="关闭" color="neutral" @click="editorOpen = false" /></template
    ></UModal>
  </main>
</template>
