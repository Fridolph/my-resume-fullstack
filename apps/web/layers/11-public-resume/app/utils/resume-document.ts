import { resumeDocumentSchema, type CapabilityData, type ResumeDocument, importResumeDocument } from '@rs/common'
import { resumeContentMockZh } from '#layers/public-resume/app/mock/resume-content.zh'
import { resumeDisplayMock } from '#layers/public-resume/app/mock/resume-display'

/**
 * `toResumeContent` / `importResumeDocument` 已上提到 **`@rs/common`**（DAO-034）：
 * 两端展示组件都要吃 `ResumeContent`，这层映射属共享能力。这里转发是为了 web 内部既有引用不动。
 *
 * 本文件**只留 web 私有**的那一个函数：`createDemoResumeDocument` 依赖本 layer 的 mock 数据，
 * 是"演示数据装配"，不是可复用能力，所以不跟着上提。
 */
export { importResumeDocument, toResumeContent } from '@rs/common'

/** 用 web 的 mock 内容 + 给定的能力数据装配一份完整文档（演示 / seed 用） */
export function createDemoResumeDocument(capabilities: CapabilityData): ResumeDocument {
  const content = structuredClone(resumeContentMockZh)
  content.profile.hero.frontImageUrl = ''
  content.profile.hero.backImageUrl = ''
  content.profile.gallery = []
  content.profile.interests = content.profile.interests.map(interest => ({ ...interest, images: [] }))
  content.profile.radar = []
  const document = importResumeDocument(content, structuredClone(resumeDisplayMock))
  const module = document.content.sections.find(section => section.type === 'capabilities')!
  if (module.type === 'capabilities') module.data = structuredClone(capabilities)
  document.display.sections.overrides[module.id] = {
    capabilities: {
      view: 'bar',
      dimensionIds: capabilities.dimensions.map(dimension => dimension.id),
      previewItemCount: 3,
    },
  }
  return resumeDocumentSchema.parse(document)
}
