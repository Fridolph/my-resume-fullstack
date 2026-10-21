/**
 * 分享链接的有效期选项（与后端 `SHARE_EXPIRY_OPTIONS` 一一对应）。
 *
 * 放在 web 侧而不是 `@rs/common`：这些是**文案与产品口径**（"当天内""1 周"），
 * 按三层判据属于业务侧；共享层只放能脱离 Vue 的纯数据与规则。
 */
export type ShareExpiryOption = 'today' | '3d' | '7d' | '30d' | 'custom'

export const SHARE_EXPIRY_CHOICES: Array<{ label: string; value: ShareExpiryOption }> = [
  { label: '当天内', value: 'today' },
  { label: '3 天', value: '3d' },
  { label: '1 周', value: '7d' },
  { label: '1 个月', value: '30d' },
  { label: '自定义', value: 'custom' },
]

/** 默认 3 天：找工作期间会频繁改简历（Owner 2026-10-19） */
export const SHARE_DEFAULT_EXPIRY: ShareExpiryOption = '3d'

/** 与后端一致的上限，用于输入框提示（真正的强制在服务端） */
export const SHARE_MAX_DAYS = 90
