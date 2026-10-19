<script setup lang="ts">
import ResumePdfWorkspace from '#layers/ui/app/components/pdf/resume/ResumePdfWorkspace.vue'
import { createResumeApi } from '../../../apis/resume'

/** 本人草稿 PDF，所有权由后端读取和下载两次校验。 */
definePageMeta({ layout: false, title: 'PDF 预览', middleware: ['auth'] })
const route = useRoute()
const id = computed(() => Number(route.params.id))
const api = createResumeApi()
const { data, status, refresh } = await useAsyncData(
  () => `resume-pdf:${id.value}`,
  () => api.getDraft(id.value),
  { watch: [id] },
)
const document = computed(() => data.value?.document ?? null)
const exportPdf = (hash: string) => api.exportPdf(id.value, hash)
</script>

<template>
  <ResumePdfWorkspace
    v-if="document"
    :document="document"
    :name="data?.resume.name"
    :back-to="`/resume/${id}`"
    :export-pdf="exportPdf"
    @refresh="refresh()"
  />
  <div v-else class="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <p>{{ status === 'pending' ? '正在读取草稿…' : '草稿不存在、无权访问或读取失败。' }}</p>
    <UButton label="重试" @click="refresh()" />
    <UButton label="返回简历列表" to="/resume" color="neutral" variant="ghost" />
  </div>
</template>
