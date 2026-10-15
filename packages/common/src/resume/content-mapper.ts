/**
 * 简历「文档 ⇄ 展示内容」的双向映射。
 *
 * - `toResumeContent`：契约文档 → 展示域形状（`ResumeContent`）。**只读展示**（public 站、admin 详情预览）
 *   与草稿编辑器都以它为入口；
 * - `importResumeDocument`：展示域形状 → 契约文档。用于把 mock / 旧数据装配成完整文档（如 seed 与演示数据）。
 *
 * 从 `apps/web/layers/11-public-resume/app/utils/resume-document.ts` 上提到这里（DAO-034）。
 * 两端的展示组件都要吃 `ResumeContent`，这层映射属于**共享**能力，不是 web 私有实现。
 *
 * ⚠️ 两层的键名**有意不同**（契约 `capabilities` ↔ 展示 `skills`），桥接只保留在
 * `sections.ts` 的 `toLegacySectionKey` 里 —— 见该函数上方的说明。
 * 本文件不依赖任何 mock（演示数据仍留在 web 侧，由它自己拼接）。
 */

import { resumeDocumentSchema, type ResumeDocument, type ResumeSection } from './document.js'
import { type CapabilityData } from './capabilities.js'
import type { ResumeContent, ResumeDisplayConfig } from './content.js'
import { toLegacySectionKey } from './sections.js'

const titles = {
  profile: '基本信息',
  highlights: '核心竞争力',
  education: '教育经历',
  experience: '工作经历',
  projects: '项目经历',
  capabilities: '专业技能',
  evaluations: '自我评价',
}
const textItems = (items: string[] = []) => items.map(text => ({ id: globalThis.crypto.randomUUID(), text }))
const newId = () => globalThis.crypto.randomUUID()

export function importResumeDocument(content: ResumeContent, display: ResumeDisplayConfig): ResumeDocument {
  const profile = content.profile
  const sections: ResumeSection[] = [
    {
      id: newId(),
      type: 'profile',
      title: titles.profile,
      data: {
        name: profile.name,
        headline: profile.headline,
        summary: profile.summary,
        avatarText: profile.avatarText,
        availability: profile.availability,
        hero: { ...profile.hero, slogans: textItems(profile.hero.slogans) },
        infoItems: profile.contact.map(({ key, ...item }) => ({ ...item, id: newId(), kind: key })),
        links: profile.links.map(item => ({ ...item, id: newId() })),
        interests: profile.interests.map(item => ({
          ...item,
          id: newId(),
          images: (item.images ?? []).map(image => ({ ...image, id: newId() })),
        })),
        stats: (profile.stats ?? []).map(item => ({ ...item, id: newId() })),
        gallery: (profile.gallery ?? []).map(item => ({ ...item, id: newId() })),
      },
    },
    {
      id: newId(),
      type: 'highlights',
      title: titles.highlights,
      data: { items: content.highlights.map(item => ({ ...item, id: newId() })) },
    },
    {
      id: newId(),
      type: 'education',
      title: titles.education,
      data: {
        items: content.education.map(({ period, ...item }) => ({
          ...item,
          id: newId(),
          date: { mode: 'custom', text: period },
        })),
      },
    },
    {
      id: newId(),
      type: 'experience',
      title: titles.experience,
      data: {
        items: content.experience.map(({ period, achievements, tech, ...item }) => ({
          ...item,
          id: newId(),
          date: { mode: 'custom', text: period },
          achievements: textItems(achievements),
          tech: textItems(tech),
        })),
      },
    },
    {
      id: newId(),
      type: 'projects',
      title: titles.projects,
      data: {
        items: content.projects.map(({ period, features, highlights, tech, ...item }) => ({
          ...item,
          id: newId(),
          date: { mode: 'custom', text: period },
          features: textItems(features),
          highlights: textItems(highlights),
          tech: textItems(tech),
        })),
      },
    },
    {
      id: newId(),
      type: 'capabilities',
      title: titles.capabilities,
      data: {
        groups: content.skills.map(group => ({
          id: newId(),
          title: group.group,
          items: group.items.map(name => ({ id: newId(), name, evidenceLinks: [] })),
        })),
        ratingScale: { min: 0, max: 100, basis: '' },
        dimensions: (profile.radar ?? []).map(item => ({ id: newId(), label: item.label, score: item.value })),
      },
    },
    { id: newId(), type: 'evaluations', title: titles.evaluations, data: { items: textItems(content.evaluations) } },
  ]
  const ordered = [...display.sections.order, ...Object.keys(titles).map(toLegacySectionKey)]
  const order = [...new Set(ordered)].flatMap(key =>
    sections.filter(section => toLegacySectionKey(section.type) === key).map(section => section.id),
  )
  return resumeDocumentSchema.parse({
    schemaVersion: 1,
    content: { sections, footer: { note: content.footerNote } },
    display: {
      ...display,
      sections: {
        order,
        hidden: sections
          .filter(section => display.sections.hidden.includes(toLegacySectionKey(section.type)))
          .map(section => section.id),
        slot: Object.fromEntries(
          sections.map(section => [
            section.id,
            display.sections.slot[toLegacySectionKey(section.type)] ?? (section.type === 'profile' ? 'side' : 'main'),
          ]),
        ),
        overrides: Object.fromEntries(
          sections
            .filter(section => section.type === 'capabilities')
            .map(section => [
              section.id,
              {
                capabilities: {
                  view: 'bar',
                  dimensionIds: section.data.dimensions.map(dimension => dimension.id),
                  previewItemCount: 3,
                },
              },
            ]),
        ),
      },
    },
  })
}

function period(date: Extract<ResumeSection, { type: 'education' }>['data']['items'][number]['date']) {
  return date.mode === 'custom' ? date.text : `${date.start} - ${date.isCurrent ? '至今' : date.end}`
}

export function toResumeContent(document: ResumeDocument, target?: ResumeSection): ResumeContent {
  const sections = document.content.sections
  const profile = sections.find(section => section.type === 'profile')!
  if (profile.type !== 'profile') throw new Error('基本信息模块缺失')
  const pick = <SectionType extends ResumeSection['type']>(type: SectionType) =>
    (target?.type === type ? target : sections.find(section => section.type === type)) as
      | Extract<ResumeSection, { type: SectionType }>
      | undefined
  const profileData = profile.data
  return {
    profile: {
      ...profileData,
      hero: { ...profileData.hero, slogans: profileData.hero.slogans.map(item => item.text) },
      contact: profileData.infoItems.map(({ kind, ...item }) => ({
        ...item,
        key: kind as ResumeContent['profile']['contact'][number]['key'],
      })),
    },
    highlights: pick('highlights')?.data.items ?? [],
    education: pick('education')?.data.items.map(item => ({ ...item, period: period(item.date) })) ?? [],
    experience:
      pick('experience')?.data.items.map(item => ({
        ...item,
        period: period(item.date),
        achievements: item.achievements.map(text => text.text),
        tech: item.tech.map(text => text.text),
      })) ?? [],
    projects:
      pick('projects')?.data.items.map(item => ({
        ...item,
        period: period(item.date),
        features: item.features.map(text => text.text),
        highlights: item.highlights.map(text => text.text),
        tech: item.tech.map(text => text.text),
      })) ?? [],
    skills:
      pick('capabilities')?.data.groups.map(group => ({
        group: group.title,
        items: group.items.map(item => item.name),
      })) ?? [],
    evaluations: pick('evaluations')?.data.items.map(item => item.text) ?? [],
    footerNote: document.content.footer.note,
  }
}
