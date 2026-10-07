<script lang="ts" setup>
interface PdfPageProps {
  /** 手动指定当前页码（不传则由 PdfDocument 自动计算） */
  page?: number
  /** 手动指定总页数（不传则由 PdfDocument 自动计算） */
  totalPages?: number
  /** 页类型 */
  pageType?: 'cover' | 'content'
  /** 内容额外样式 */
  contentClass?: any
  /** 横向布局（宽高互换） */
  landscape?: boolean
}

const { page, totalPages, pageType = 'content', contentClass, landscape = false } = defineProps<PdfPageProps>()

// 向最近的 PdfDocument 注册自身（携带页类型），自动获取页码与总页数
const { pageNumber: autoPage, totalPages: autoTotal } = usePdfPage(() => pageType)

// props 优先，其次回退到自动计算的值
const resolvedPage = computed(() => page ?? (autoPage.value || undefined))
const resolvedTotal = computed(() => totalPages ?? (autoTotal.value || undefined))
</script>

<template>
  <div class="pdf-page relative bg-white font-sans antialiased shadow-lg flex flex-col" :data-page-type="pageType" :data-orientation="landscape ? 'landscape' : 'portrait'">
    <header v-if="$slots.header" class="shrink-0 border-b border-gray-200 pb-4">
      <slot name="header" />
    </header>

    <div class="min-h-0 flex-1 overflow-hidden" :class="{ 'py-4': pageType === 'content', ...contentClass }">
      <slot />
    </div>

    <footer v-if="$slots.footer || resolvedPage" class="shrink-0 text-center text-xs text-gray-400 absolute bottom-[calc(10.58333mm-16px)] inset-x-0">
      <slot name="footer" :page="resolvedPage" :total-pages="resolvedTotal">
        <span v-if="resolvedPage && pageType === 'content'">
          第 {{ resolvedPage }} 页<span v-if="resolvedTotal"> / 共 {{ resolvedTotal }} 页</span>
        </span>
      </slot>
    </footer>
  </div>
</template>

<style scoped>
.pdf-page {
  width: 210mm;
  height: 297mm;
  box-sizing: border-box;
  margin-left: auto;
  margin-right: auto;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;

  &[data-orientation="landscape"] {
    width: 297mm;
    height: 210mm;
  }

  &[data-page-type="cover"] {
    padding: 0;
  }

  &[data-page-type="content"] {
    padding: 10.58333mm;
  }
}

@media print {
  .pdf-page {
    width: 210mm !important;
    height: 297mm !important;
    min-height: 297mm !important;
    max-height: 297mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: always !important;
    break-after: page !important;
    overflow: hidden;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .pdf-page[data-orientation="landscape"] {
    width: 297mm !important;
    height: 210mm !important;
    min-height: 210mm !important;
    max-height: 210mm !important;
  }

  .pdf-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }

  &[data-page-type="cover"] {
    padding: 0 !important;
  }

  &[data-page-type="content"] {
    padding: 10.58333mm !important;
  }
}
</style>
