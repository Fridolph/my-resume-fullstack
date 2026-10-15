/**
 * PDF 文档配置类型（配置驱动渲染 + 后端导出预留）。
 *
 * 设计目标：把「封面要不要 / 封面元素与位置 / 每页页眉」都变成可传入的数据，
 * 页面只负责提供内容，配置负责版式。个人简历项目可直接复用这套结构。
 */

/** 封面图展示模式 */
export type PdfCoverImageMode =
  /** 不显示图片，纯色/渐变封面 */
  | 'none'
  /** 图片作为上半页横幅，文字在其下方 */
  | 'banner'
  /** 图片铺满整页，文字叠在图片上（自动加暗色遮罩） */
  | 'background'

/** 内容水平对齐 */
export type PdfAlign = 'left' | 'center' | 'right'

/** 文本垂直位置 */
export type PdfTextVertical = 'top' | 'center' | 'bottom'

export interface PdfCoverConfig {
  /** 是否渲染封面页；false 时直接进入内容页 */
  enabled: boolean
  /** 封面图地址（完整 URL 或 static 路径）；为空则不渲染图片 */
  image?: string
  /** 图片展示模式，默认 none */
  imageMode?: PdfCoverImageMode
  /** 标题上方的 eyebrow 小字（如 “Report” / “Resume”） */
  eyebrow?: string
  /** 主标题 */
  title?: string
  /** 副标题 / 描述 */
  description?: string
  /** 底部（渐变区）标题 */
  footerTitle?: string
  /** 底部（渐变区）说明 */
  footerText?: string
  /** 文本水平对齐，默认 left */
  align?: PdfAlign
  /** 文本垂直位置，默认 top */
  vertical?: PdfTextVertical
  /** 封面渐变起始色 */
  gradientFrom?: string
  /** 封面渐变结束色 */
  gradientTo?: string
}

export interface PdfHeaderConfig {
  /** 是否显示每页页眉 */
  enabled: boolean
  /** 页眉左侧标题（不显示封面时，通常填文档标题，如“简历”） */
  title?: string
  /** 页眉右侧文本；填 'auto' 表示自动使用今天日期 */
  meta?: string
}

export interface PdfDocConfig {
  cover: PdfCoverConfig
  header: PdfHeaderConfig
  /** 导出/打印的默认文件名（后端导出时作为文件名与业务标签） */
  fileName?: string
}

/**
 * 后端导出请求体。
 *
 * 与 greensketch 的 `/sketch/share/project/download` 对齐：前端把自己这个预览页的
 * 完整 URL 交给后端，后端用无头浏览器打开并等待就绪锚点后生成 PDF。
 */
export interface PdfExportPayload {
  /** 待渲染页面完整 URL（当前预览页地址） */
  url: string
  /** 业务场景标识（后端据此选模板 / 鉴权 / 存储路径） */
  scene?: string | number
  /** 业务主键，便于后端命名与鉴权，如项目 outerId */
  outerId?: string | number
  /** 业务子键，如设计 designId */
  designId?: string | number
  /** 文件名 / 标签（即 config.fileName） */
  fileName?: string
  /** 预留：透传给后端的额外参数（纸张、是否含封面等） */
  options?: Record<string, unknown>
}
