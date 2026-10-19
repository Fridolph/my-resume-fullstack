<script setup lang="ts">
import ResumePdfWorkspace from '#layers/ui/app/components/pdf/resume/ResumePdfWorkspace.vue'
import { usePublicResume } from '#layers/public-resume/app/composables/usePublicResume'
import { createPublicResumeApi } from '#layers/public-resume/app/apis/resume-public'

/** 登录后预览已发布内容；草稿导出入口在 admin。 */
definePageMeta({ layout: false, title: 'PDF 预览' })
const route = useRoute()
const id = computed(() => Number(route.params.id))
const { isAuthed } = useAuthState()
const api = createPublicResumeApi()
const { document, status, refresh, resume } = usePublicResume(() =>
  isAuthed.value && Number.isInteger(id.value) && id.value > 0 ? id.value : null,
)
await resume
const name = computed(
  () => document.value?.content.sections.find(section => section.type === 'profile')?.data.name || '简历',
)
const exportPdf = (hash: string) => api.exportPdf(id.value, hash)
</script>

<template>
  <ResumePdfWorkspace
    v-if="isAuthed && document"
    :document="document"
    :name="name"
    :back-to="`/resume/${id}`"
    :export-pdf="exportPdf"
    @refresh="refresh()"
  />
  <div
    v-else
    class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center text-slate-700"
  >
    <h1 class="text-lg font-semibold">PDF 预览</h1>
    <p v-if="!isAuthed">PDF 预览与下载需要登录，请先前往「我的简历」登录。</p>
    <p v-else-if="status === 'pending'">正在读取简历…</p>
    <p v-else>{{ status === 'error' ? '读取失败，请重试。' : '简历不存在或尚未发布。未发布草稿请在管理端预览。' }}</p>
    <UButton v-if="!isAuthed" label="去我的简历" to="/my-resumes" />
    <UButton v-else label="重试" @click="refresh()" />
    <UButton label="返回简历" :to="`/resume/${id}`" color="neutral" variant="ghost" />
  </div>
</template>
