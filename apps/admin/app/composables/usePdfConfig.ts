import type { PdfDocConfig } from '~/types/pdf'

/**
 * PDF 文档配置：抽屉（Drawer）里的编辑态 + 页面渲染用的生效态。
 *
 * 两份状态的原因：抽屉里改配置要**即时校验但延迟生效**——
 * - `draft`：抽屉表单绑定的编辑态，随便改，随便校验；
 * - `config`：真正驱动页面渲染的生效态，只有点 Save 才写回。
 * Cancel / 直接关闭抽屉 = 丢弃 draft（下次打开会重新从 config 同步）。
 *
 * 用 `useState` 共享，让 pdf 布局的「Config」按钮（`openDrawer`）和页面里的抽屉读到同一份状态。
 */

/** 生成带当天日期时间的默认文件名：`pdf-review_2026-10-06_153012.pdf` */
export function defaultPdfFileName(prefix = 'pdf-review', date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${prefix}_${stamp}.pdf`
}

/** 默认配置：开箱即可预览（封面 + 页眉 + 自动文件名） */
export function createDefaultPdfConfig(): PdfDocConfig {
  return {
    cover: {
      enabled: true,
      image: '',
      imageMode: 'none',
      eyebrow: 'Report',
      title: 'Workspace review',
      description: 'A4 print preview — 用 PdfPage / PdfCoverSheet 按纸张渲染现有组件。',
      footerTitle: 'A4 print preview template',
      footerText: '改配置即时预览；Print 调起浏览器打印（另存为 PDF）。',
      align: 'left',
      vertical: 'top',
      gradientFrom: '#00e944',
      gradientTo: '#06f',
    },
    header: {
      enabled: true,
      title: 'Workspace review',
      meta: 'auto',
    },
    fileName: defaultPdfFileName(),
  }
}

/** 纯数据深拷贝（config 只含字符串/布尔，JSON 往返足够且不会碰到 reactive proxy） */
function cloneConfig(config: PdfDocConfig): PdfDocConfig {
  return JSON.parse(JSON.stringify(config))
}

export function usePdfConfig() {
  const open = useState<boolean>('pdf-config:open', () => false)
  const config = useState<PdfDocConfig>('pdf-config:value', () => createDefaultPdfConfig())
  const draft = useState<PdfDocConfig>('pdf-config:draft', () => createDefaultPdfConfig())

  /** 打开抽屉：把生效配置同步进编辑态 */
  function openDrawer() {
    draft.value = cloneConfig(config.value)
    open.value = true
  }

  /** 保存：校验通过后把编辑态写回生效配置 */
  function save() {
    config.value = cloneConfig(draft.value)
    open.value = false
  }

  /** 取消：丢弃编辑态 */
  function cancel() {
    draft.value = cloneConfig(config.value)
    open.value = false
  }

  /** 恢复默认配置（编辑态） */
  function reset() {
    draft.value = createDefaultPdfConfig()
  }

  return { open, config, draft, openDrawer, save, cancel, reset }
}
