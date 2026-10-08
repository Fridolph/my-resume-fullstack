import type { ResumeSectionKey } from '#layers/public-resume/app/types/resume'

/**
 * 区块编辑 schema。
 *
 * 这是「新增区块」的第三处（另外两处：展示组件、注册表）——
 * 有它之后，编辑表单不需要为每个区块手写一套组件。
 *
 * 一个区块由**若干段**组成（`segments`）：因为一个区块里常常既有"直接改几个字段"，
 * 又有"编辑某个对象数组"（如 `profile` 的基础信息 + 链接 + 兴趣），
 * 单一 `mode` 表达不了。
 */

export type ResumeFieldType = 'text' | 'textarea' | 'tags' | 'number'

export interface ResumeFieldSchema {
  /** `fields` 模式：相对 ResumeContent 的路径，如 `profile.name` / `profile.hero.slogans` */
  path?: string
  /** `list` 模式：数组项上的字段名 */
  key?: string
  label: string
  type: ResumeFieldType
  /** 占整行（长文本、标签数组用） */
  wide?: boolean
  placeholder?: string
}

/** 编辑表单的一段 */
export interface ResumeFieldGroupSchema {
  /** `fields`：直接编辑若干字段；`list`：编辑某个数组 */
  mode: 'fields' | 'list'
  /** 段标题（抽屉里显示）；也可以省略 */
  label?: string
  /** `list` 模式下数组路径，**支持点号**（如 `profile.links`） */
  listPath?: string
  /** `list` 模式下用哪个字段做项标题 */
  titleKey?: string
  /** `list` 模式下新增项的模板 */
  blank?: Record<string, unknown>
  fields: ResumeFieldSchema[]
}

export interface ResumeSectionEditorSchema {
  segments: ResumeFieldGroupSchema[]
}

export const resumeEditorSchemas: Record<ResumeSectionKey, ResumeSectionEditorSchema> = {
  // profile 有四种东西要编辑：基础信息、主视觉（hero）、链接、兴趣 → 四段
  profile: {
    segments: [
      {
        mode: 'fields',
        label: '基础信息',
        fields: [
          { path: 'profile.name', label: '姓名', type: 'text' },
          { path: 'profile.headline', label: '定位 / 方向', type: 'text' },
          {
            path: 'profile.avatarText',
            label: '头像文字',
            type: 'text',
            placeholder: '留空则取姓名首字',
          },
          { path: 'profile.summary', label: '个人概述', type: 'textarea', wide: true },
          {
            path: 'profile.availability',
            label: '求职状态（精致风格展示）',
            type: 'text',
            placeholder: '如「可接受新机会」；留空则不展示',
          },
        ],
      },
      {
        mode: 'fields',
        label: '主视觉',
        fields: [
          {
            path: 'profile.hero.frontImageUrl',
            label: '头像正面图 URL',
            type: 'text',
            placeholder: '留空则回退为头像文字',
          },
          { path: 'profile.hero.backImageUrl', label: '头像背面图 URL', type: 'text' },
          {
            path: 'profile.hero.linkUrl',
            label: '头像链接',
            type: 'text',
            placeholder: '本轮只存不跳转',
          },
          {
            path: 'profile.hero.slogans',
            label: '标语（最多展示 2 条）',
            type: 'tags',
            wide: true,
          },
        ],
      },
      {
        mode: 'list',
        label: '数据块（精致风格）',
        listPath: 'profile.stats',
        titleKey: 'label',
        blank: { label: '新数据', value: '', hint: '' },
        fields: [
          { key: 'label', label: '名称', type: 'text' },
          { key: 'value', label: '数值', type: 'text', placeholder: '如「5 年」「30+」' },
          { key: 'hint', label: '补充说明', type: 'text', wide: true },
        ],
      },
      {
        mode: 'list',
        label: '能力雷达（精致风格）',
        listPath: 'profile.radar',
        titleKey: 'label',
        blank: { label: '新维度', value: 60 },
        fields: [
          { key: 'label', label: '维度', type: 'text' },
          { key: 'value', label: '分值 0~100', type: 'number' },
        ],
      },
      {
        mode: 'list',
        label: '形象画廊（精致风格）',
        listPath: 'profile.gallery',
        titleKey: 'alt',
        blank: { url: '', alt: '' },
        fields: [
          { key: 'url', label: '图片地址', type: 'text', wide: true },
          { key: 'alt', label: '替代文字', type: 'text' },
        ],
      },
      {
        mode: 'list',
        label: '个人链接',
        listPath: 'profile.links',
        titleKey: 'label',
        blank: { label: '新链接', url: '', icon: '' },
        fields: [
          { key: 'label', label: '名称', type: 'text' },
          { key: 'url', label: '链接', type: 'text' },
          { key: 'icon', label: '图标名', type: 'text', placeholder: '如 ri:github-fill' },
        ],
      },
      {
        mode: 'list',
        label: '兴趣',
        listPath: 'profile.interests',
        titleKey: 'label',
        blank: { label: '新兴趣', icon: '', description: '' },
        // 注：`images`（图集）本轮**不在表单里编辑** —— 现有 `ResumeSchemaForm` 只支持
        // 基础字段与「对象数组」两层，图集是「数组里的数组」，要它可编辑得先扩表单能力。
        // 展示侧已按「无图集就不开弹窗」容错，所以不影响编辑者使用其它字段。
        fields: [
          { key: 'label', label: '名称', type: 'text' },
          { key: 'icon', label: '图标名', type: 'text', placeholder: '如 ri:camera-line' },
          { key: 'description', label: '说明', type: 'textarea', placeholder: '一句话，hover 时以 tooltip 显示' },
        ],
      },
    ],
  },
  highlights: {
    segments: [
      {
        mode: 'list',
        listPath: 'highlights',
        titleKey: 'title',
        blank: { title: '新的亮点', description: '' },
        fields: [
          { key: 'title', label: '标题', type: 'text' },
          { key: 'description', label: '说明', type: 'textarea', wide: true },
        ],
      },
    ],
  },
  education: {
    segments: [
      {
        mode: 'list',
        listPath: 'education',
        titleKey: 'school',
        blank: { school: '新学校', period: '', degree: '', major: '' },
        fields: [
          { key: 'school', label: '学校', type: 'text' },
          { key: 'period', label: '时间', type: 'text', placeholder: '2017.09 - 2021.06' },
          { key: 'degree', label: '学位', type: 'text' },
          { key: 'major', label: '专业', type: 'text' },
        ],
      },
    ],
  },
  experience: {
    segments: [
      {
        mode: 'list',
        listPath: 'experience',
        titleKey: 'company',
        blank: {
          company: '新公司',
          period: '',
          role: '',
          domain: '',
          overview: '',
          achievements: [],
          tech: [],
        },
        fields: [
          { key: 'company', label: '公司', type: 'text' },
          { key: 'period', label: '时间', type: 'text' },
          { key: 'role', label: '职位', type: 'text' },
          { key: 'domain', label: '行业 / 类型', type: 'text' },
          { key: 'overview', label: '工作概述', type: 'textarea', wide: true },
          { key: 'achievements', label: '主要成果', type: 'tags', wide: true },
          { key: 'tech', label: '技术栈', type: 'tags', wide: true },
        ],
      },
    ],
  },
  projects: {
    segments: [
      {
        mode: 'list',
        listPath: 'projects',
        titleKey: 'name',
        blank: {
          name: '新项目',
          period: '',
          role: '',
          overview: '',
          features: [],
          highlights: [],
          tech: [],
        },
        fields: [
          { key: 'name', label: '项目名', type: 'text' },
          { key: 'period', label: '时间', type: 'text' },
          { key: 'role', label: '角色', type: 'text' },
          { key: 'overview', label: '项目概览', type: 'textarea', wide: true },
          { key: 'features', label: '核心功能', type: 'tags', wide: true },
          { key: 'highlights', label: '亮点 / 难点', type: 'tags', wide: true },
          { key: 'tech', label: '技术栈', type: 'tags', wide: true },
        ],
      },
    ],
  },
  skills: {
    segments: [
      {
        mode: 'list',
        listPath: 'skills',
        titleKey: 'group',
        blank: { group: '新分组', items: [] },
        fields: [
          { key: 'group', label: '分组', type: 'text' },
          { key: 'items', label: '技能项', type: 'tags', wide: true },
        ],
      },
    ],
  },
  evaluations: {
    segments: [
      {
        mode: 'fields',
        fields: [
          { path: 'evaluations', label: '自我评价', type: 'tags', wide: true },
          { path: 'footerNote', label: '结尾致谢', type: 'textarea', wide: true },
        ],
      },
    ],
  },
}
