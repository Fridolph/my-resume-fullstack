import type {
  ResumeSectionKey,
  ResumeSectionSummary,
  ResumeContent,
  ResumeDisplayOptions,
  ResumeThemeConfig,
  ResumeStyleId,
} from '@rs/common'

/**
 * 展示组件的 props 形状（**在 ui 内定义**，字段类型仍来自 `@rs/common`）。
 *
 * 为什么不在组件里直接 `defineProps<ResumeSectionProps>()`（从 `@rs/common` 引）：
 * Vue 的 SFC 编译器**不展开包的 re-export 链**，`defineProps` 的整块类型来自包外就解析不了 ——
 * `typecheck` / `build` 都不报，**只有 dev 的 SFC 编译会炸**。
 * 把外层类型放在本地文件后，编译器只解析外层结构，字段类型解析不到会降级（不报错）。
 *
 * ⚠️ 若 `@rs/common` 的对应接口改了字段，这里要同步（字段本身仍是 common 的类型，不会各说各话）。
 */

export interface ResumeHeroProps {
  content: ResumeContent
  options: ResumeDisplayOptions
  variant: ResumeStyleId
}

export interface ResumeSectionBodyProps {
  content: ResumeContent
  options: ResumeDisplayOptions
  variant: ResumeStyleId
}

export interface ResumeSectionProps {
  /** `id` 是文档内的实例身份 —— 自定义模块靠它区分同 view 的多个实例 */
  section: ResumeSectionSummary
  content: ResumeContent
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  variant: ResumeStyleId
}
