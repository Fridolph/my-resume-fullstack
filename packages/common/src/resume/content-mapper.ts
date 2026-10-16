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
import type {
  ResumeContent,
  ResumeCustomSectionDraft,
  ResumeCustomView,
  ResumeDisplayConfig,
  ResumeSectionKey,
  ResumeSlotKey,
} from './content.js'
import { getSectionDefinition, resumeSectionDefinitions, toLegacySectionKey } from './sections.js'

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
    // 清单按文档顺序生成：label / icon 取共享的区块定义（未定义的类型用 type 兜底）
    sections: sections.map(section => {
      const key = toLegacySectionKey(section.type)
      const definition = getSectionDefinition(key)
      // 自定义模块**没有固定名字**：它的显示名与图标一律取实例自己的字段
      // （「自定义模块」这个词只是新增时的默认模板，不是它的名字）。
      // 预设模块则相反 —— 名字来自共享定义，用户不通过 title 改它。
      const isCustom = section.type === 'custom'

      return {
        id: section.id,
        key,
        label: isCustom ? section.title : (definition?.label ?? section.title),
        icon: isCustom ? (section.icon ?? 'i-lucide-shapes') : (definition?.icon ?? 'i-lucide-file-text'),
        description: section.description,
      }
    }),
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
    // 自定义模块是**多实例**，不能用 pick（它按 type 取第一个）；这里按文档顺序全取，
    // 渲染时再由 section.id 找到自己那一份。时间轴条目统一转成显示文本（与其它区块一致）。
    custom: sections
      .filter(section => section.type === 'custom')
      .map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        view: section.data.view,
        items:
          'items' in section.data && section.data.view !== 'timeline' ? section.data.items.map(item => item.text) : [],
        timeline:
          section.data.view === 'timeline'
            ? section.data.items.map(item => ({
                id: item.id,
                time: period(item.time),
                title: item.title,
                description: item.description,
              }))
            : [],
        document: section.data.view === 'richText' ? section.data.content : undefined,
      })),
    footerNote: document.content.footer.note,
  }
}

/**
 * 把**文档里的展示配置**（`document.display`）转成展示层使用的 `ResumeDisplayConfig`。
 *
 * 两者形状相近但不是同一个东西 —— 关键差异在 `sections`：
 * - 契约用**文档内 id** 标识模块（`order: id[]`、`slot: Record<id, …>`、`hidden: id[]`），
 *   因为文档里的 id 是权威身份；
 * - 展示层用**区块 key**（`order: ResumeSectionKey[]`，即 `profile` / `skills`…），
 *   因为渲染时按"区块种类"找组件，而 id 每次创建都不同。
 *
 * 所以这里做的是 id → key 的翻译，并把契约里有、展示层没列的 id 丢掉；
 * 没被配置列出的区块按注册表默认顺序补齐（与 `useResumeLayout` 的补齐规则一致）。
 *
 * ⚠️ 已知未做：契约的 `sections.overrides`（目前只存能力模块的展示视图）在展示层没有对应字段，
 * 本函数**不搬运它** —— 详情页当前用能力模块的默认视图。要支持"按文档指定的视图渲染"时，
 * 需要在 `ResumeDisplayConfig` 上补一个字段（属后续工作）。
 */
export function toResumeDisplayConfig(document: ResumeDocument): ResumeDisplayConfig {
  return {
    brand: document.display.brand,
    layout: document.display.layout,
    options: document.display.options,
    theme: document.display.theme,
    background: document.display.background,
    style: document.display.style,
    // 排布**直通**：契约与展示层现在用同一套寻址（section id），不需要再翻译成区块 key。
    // 补齐「配置没列出的区块」由 `useResumeLayout` 用文档清单完成。
    sections: {
      order: [...document.display.sections.order],
      slot: { ...document.display.sections.slot },
      hidden: [...document.display.sections.hidden],
    },
  } as ResumeDisplayConfig
}

/**
 * 自定义模块的**编辑态草稿**。
 *
 * 编辑界面用的形状，和契约刻意不同：
 * - `items` / `timeline[].time` 都是**纯字符串**（编辑时就是"一行一条"／一段文本），
 *   而契约里它们带 `id`、时间还要走 `resumeDateSchema` 的两种模式；
 * - `description` 在编辑态一律是字符串（空串 = 没填），契约里是可选的。
 *
 * 两者靠下面的一对函数往返。放在 common 是因为 web 与 admin 的编辑界面都要用，
 * 各写一份必然漂移（这个仓库已经因为这类重复吃过亏）。
 */
/** 契约里 `custom` 分支的区块类型 */
export type ResumeCustomSectionNode = Extract<ResumeSection, { type: 'custom' }>

/**
 * 契约的 custom 区块 → 编辑态草稿。
 *
 * 收的是**契约形状**而不是展示态：编辑界面握着的就是文档里的那一份，
 * 让草稿转换直接对上契约，省掉"先转展示态再转回来"的绕路。
 */
export function toCustomSectionDraft(section: ResumeCustomSectionNode): ResumeCustomSectionDraft {
  const data = section.data

  return {
    title: section.title,
    description: section.description ?? '',
    view: data.view,
    items: 'items' in data && data.view !== 'timeline' ? data.items.map(item => item.text) : [],
    timeline:
      data.view === 'timeline'
        ? data.items.map(item => ({
            // 结构化日期在编辑界面里显示成一行文本；存回时统一走 custom 模式
            time: item.time.mode === 'custom' ? item.time.text : `${item.time.start} ~ ${item.time.end ?? '至今'}`,
            title: item.title,
            description: item.description ?? '',
          }))
        : [],
    document: data.view === 'richText' ? data.content : undefined,
  }
}

/**
 * 编辑态草稿 → 契约里的 `custom` 区块。
 *
 * - `base` 传入现有区块时**保留它的 id**（编辑语义）；新增时不传，这里生成新 id；
 * - 空文本会被丢掉（去掉空行 / 空标题的条目），避免存进一堆空壳；
 * - `timeline` 的文本时间存成 `resumeDateSchema` 的 **custom 模式**（编辑界面只让填文本，
 *   结构化日期是"教育 / 工作经历"那种场景才需要的表达）。
 */
export function fromCustomSectionDraft(
  draft: ResumeCustomSectionDraft,
  base?: { id: string; icon?: string },
): ResumeSection {
  const nextId = (): string => globalThis.crypto.randomUUID()

  const shared = {
    id: base?.id ?? nextId(),
    type: 'custom' as const,
    title: draft.title.trim() || '自定义模块',
    description: draft.description.trim() || undefined,
    icon: base?.icon,
  }
  const texts = <Item extends { id: string }>(previous: Item[] = []) =>
    draft.items.filter(text => text.trim()).map((text, index) => ({ id: previous[index]?.id ?? nextId(), text }))

  switch (draft.view) {
    case 'textList':
    case 'tagCloud':
      return { ...shared, data: { view: draft.view, items: texts() } }
    case 'timeline':
      return {
        ...shared,
        data: {
          view: 'timeline',
          items: draft.timeline
            .filter(item => item.title.trim())
            .map(item => ({
              id: nextId(),
              time: { mode: 'custom' as const, text: item.time.trim() },
              title: item.title.trim(),
              description: item.description.trim() || undefined,
            })),
        },
      }
    case 'richText':
      return { ...shared, data: { view: 'richText', content: draft.document ?? { type: 'doc', content: [] } } }
  }
}
