/**
 * 编辑页的字段表（**面向契约文档本身**，与创建页那份不同）。
 *
 * 内容已上提到 `@rs/common` 的 `ui/resume-edit-segments.ts`（纯描述、无 Vue 依赖，
 * 按三层归属判据属于共享层；web 端公开页也要用同一份，不能反向依赖 admin 的 layer）。
 * 这里只保留这一行 re-export 维持原有调用面 —— 调用点不必改动，清理留给后续。
 */
export {
  profileEditSegments,
  highlightsEditSegments,
  educationEditSegments,
  experienceEditSegments,
  projectsEditSegments,
  capabilitiesEditSegments,
  evaluationsEditSegments,
  resumeEditSegments,
} from '@rs/common'
