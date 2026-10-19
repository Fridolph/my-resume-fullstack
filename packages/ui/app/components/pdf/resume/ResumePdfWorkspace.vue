<script setup lang="ts">
import { canonicalResumeJson, normalizeApiError, resolveApiErrorMessage, type ResumeDocument } from '@rs/common'
import { createResumePdfHtml } from '@rs/ui/pdf'
import ResumePdfSettings from './ResumePdfSettings.vue'
import type { ResumePdfSettingsAdapter } from '../../../composables/useResumePdfSettings'
import { defaultResumePdfConfig, type ResumePdfConfig } from '@rs/common'
import { useResizeObserver } from '@vueuse/core'

/** 双端 PDF 工作台：隔离纸面 HTML，下载由宿主注入，不判断身份或接口路径。 */
const props = defineProps<{
  document: ResumeDocument
  name?: string
  backTo: string
  exportPdf: (documentHash: string, config: ResumePdfConfig) => Promise<Blob>
  settingsAdapter?: ResumePdfSettingsAdapter
}>()
const emit = defineEmits<{ refresh: [] }>()
const frame = useTemplateRef<HTMLIFrameElement>('frame')
const container = useTemplateRef<HTMLElement>('container')
const pages = ref(0)
const ready = ref(false)
const previewError = ref('')
const downloadError = ref('')
const downloading = ref(false)
const width = ref(850)
const zoom = ref('fit')
const html = ref('')
const generation = ref(0)
const pdfConfig = ref<ResumePdfConfig>(props.document.display.pdf ?? defaultResumePdfConfig())
const configInvalid = ref(false)
const renderDocument = computed(() => ({
  ...props.document,
  display: { ...props.document.display, pdf: pdfConfig.value },
}))
// 随页面卸载恢复，避免打印规则影响其他业务页面。
useHead({ bodyAttrs: { class: 'resume-pdf-print-host' } })
const paperWidth = (210 * 96) / 25.4
const paperHeight = (297 * 96) / 25.4
const scale = computed(() =>
  zoom.value === 'fit' ? Math.min(1, Math.max(0.1, (width.value - 24) / paperWidth)) : Number(zoom.value),
)
const frameHeight = computed(() =>
  pages.value ? pages.value * paperHeight + (pages.value - 1) * 20 + 40 : paperHeight + 40,
)
let deadline: ReturnType<typeof setTimeout> | undefined
useResizeObserver(container, entries => {
  if (entries[0]) width.value = entries[0].contentRect.width
})

/** 内容变化后重建 iframe；通过 event.source 拒绝旧文档的 ready 消息。 */
function rebuild() {
  clearTimeout(deadline)
  generation.value++
  ready.value = false
  pages.value = 0
  previewError.value = ''
  downloadError.value = ''
  try {
    html.value = createResumePdfHtml(renderDocument.value, props.name || '简历')
  } catch {
    previewError.value = '内容结构无法分页，请调整内容后重试'
    html.value = ''
    return
  }
  deadline = setTimeout(() => {
    if (!ready.value) previewError.value = '分页超时，请重试'
  }, 25_000)
}
function receive(event: MessageEvent) {
  if (event.source !== frame.value?.contentWindow) return
  if (
    event.data?.type === 'resume-pdf-ready' &&
    Number.isInteger(event.data.pages) &&
    event.data.pages > 0 &&
    event.data.pages <= 80
  ) {
    clearTimeout(deadline)
    pages.value = event.data.pages
    ready.value = true
    previewError.value = ''
  } else if (event.data?.type === 'resume-pdf-error') {
    clearTimeout(deadline)
    previewError.value = '内容无法完成分页，请重试或调整内容'
  }
}
/** 下载点击时的文档摘要；服务端拒绝与当前内容不一致的导出，失败保留预览。 */
async function download() {
  if (!ready.value || downloading.value) return
  downloading.value = true
  downloadError.value = ''
  let url: string | undefined
  try {
    const exportConfig = JSON.parse(JSON.stringify(pdfConfig.value)) as ResumePdfConfig
    const bytes = new TextEncoder().encode(canonicalResumeJson(props.document))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    const blob = await props.exportPdf(hash, exportConfig)
    url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    // 文件名需要剔除控制字符，以免系统把它解释为路径或命令。
    // eslint-disable-next-line no-control-regex
    anchor.download = `${(props.name || '简历').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80)}.pdf`
    anchor.click()
    const createdUrl = url
    setTimeout(() => URL.revokeObjectURL(createdUrl), 30_000)
    url = undefined
  } catch (error) {
    const normalized = normalizeApiError(error)
    downloadError.value =
      normalized.errorCode === 'Resume.Pdf:changed'
        ? '简历内容或展示配置已变化，请刷新预览后重新下载'
        : resolveApiErrorMessage(normalized)
  } finally {
    if (url) URL.revokeObjectURL(url)
    downloading.value = false
  }
}
onMounted(() => {
  window.addEventListener('message', receive)
  rebuild()
})
watch(
  () => renderDocument.value,
  () => {
    if (import.meta.client) rebuild()
  },
  { deep: true },
)
onBeforeUnmount(() => {
  clearTimeout(deadline)
  window.removeEventListener('message', receive)
})
</script>

<template>
  <div class="resume-pdf-workspace min-h-dvh bg-slate-100 text-slate-800">
    <header
      class="resume-pdf-controls sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"
    >
      <div>
        <h1 class="text-sm font-semibold">{{ name || '简历' }} · PDF 预览</h1>
        <p class="mt-1 text-xs text-slate-500" aria-live="polite">
          A4 · {{ ready ? `共 ${pages} 页` : '正在分页…' }} · 按模块排序与显隐
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ResumePdfSettings
          :document="document"
          :adapter="settingsAdapter"
          @saved="emit('refresh')"
          @change="pdfConfig = $event"
          @invalid="configInvalid = $event"
        />
        <UButton :to="backTo" color="neutral" variant="ghost" label="返回简历" />
        <label class="text-xs text-slate-500"
          >缩放
          <select v-model="zoom" class="ml-1 rounded border border-slate-300 bg-white px-2 py-1 text-slate-800">
            <option value="fit">适合宽度</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
          </select>
        </label>
        <UButton color="neutral" variant="outline" label="刷新内容" :disabled="downloading" @click="emit('refresh')" />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-printer"
          label="打印"
          :disabled="!ready || configInvalid"
          @click="frame?.contentWindow?.postMessage({ type: 'resume-pdf-print' }, '*')"
        />
        <UButton
          icon="i-lucide-download"
          label="下载 PDF"
          :loading="downloading"
          :disabled="!ready || downloading || configInvalid"
          @click="download"
        />
      </div>
    </header>
    <div
      v-if="previewError || downloadError"
      role="alert"
      class="resume-pdf-controls mx-auto my-4 flex max-w-3xl flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <span>{{ previewError || downloadError }}</span>
      <UButton v-if="previewError" label="重新分页" color="neutral" variant="outline" @click="rebuild" />
      <UButton v-else label="刷新内容" color="neutral" variant="outline" @click="emit('refresh')" />
    </div>
    <div ref="container" class="resume-pdf-canvas overflow-x-auto pb-8" :aria-busy="!ready">
      <div
        class="resume-pdf-paper"
        :style="{ width: `${paperWidth * scale}px`, height: `${frameHeight * scale}px`, margin: '0 auto' }"
      >
        <iframe
          :key="generation"
          ref="frame"
          title="A4 简历分页预览"
          sandbox="allow-scripts allow-modals"
          :srcdoc="html"
          :style="{
            '--resume-print-height': `${pages * 297}mm`,
            width: `${paperWidth}px`,
            height: `${frameHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: '0',
            display: 'block',
          }"
        />
      </div>
    </div>
  </div>
</template>

<style>
/* iframe 与下载使用同一纸面；浏览器菜单打印也必须还原 A4，不能带入屏幕缩放。 */
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  body.resume-pdf-print-host,
  body.resume-pdf-print-host #__nuxt,
  .resume-pdf-workspace {
    margin: 0 !important;
    padding: 0 !important;
    min-height: 0 !important;
    background: white !important;
    overflow: visible !important;
  }
  body.resume-pdf-print-host > :not(#__nuxt),
  .resume-pdf-workspace .resume-pdf-controls {
    display: none !important;
  }
  .resume-pdf-workspace .resume-pdf-canvas,
  .resume-pdf-workspace .resume-pdf-paper {
    width: 210mm !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }
  .resume-pdf-workspace iframe {
    width: 210mm !important;
    height: var(--resume-print-height) !important;
    transform: none !important;
  }
}
</style>
