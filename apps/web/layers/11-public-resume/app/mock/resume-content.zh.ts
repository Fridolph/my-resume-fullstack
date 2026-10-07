import type { ResumeContent } from '../types/resume'

/**
 * 头像占位图（内联 SVG data-URI，不引入图片资源）。
 *
 * 真图由后端快照提供；这里让 `standard` 的头像与翻牌在本地可预览，
 * 同时也验证「有图用图、无图回退 `avatarText`」两条路径。
 */
const AVATAR_FRONT
  = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231578d0'/%3E%3Ctext x='100' y='124' font-size='84' font-family='sans-serif' fill='%23ffffff' text-anchor='middle'%3E%E5%8E%89%3C/text%3E%3C/svg%3E"
const AVATAR_BACK
  = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%232f9e63'/%3E%3Ctext x='100' y='124' font-size='84' font-family='sans-serif' fill='%23ffffff' text-anchor='middle'%3E%E9%9B%A8%3C/text%3E%3C/svg%3E"

/**
 * 简历内容 mock（中文）。
 *
 * 来源：`my-resume/public/lifeiyu-mock-zh.md` 的结构化版本。
 * 接后端后，这份数据由「已发布快照」接口替代，形状保持一致即可直接替换。
 */
export const resumeContentMockZh: ResumeContent = {
  profile: {
    name: '厉飞雨',
    headline: '全栈开发 / 前端方向',
    summary:
      '5 年全栈开发经验，前端为主（Vue / React），兼顾 Node.js 服务端；重视组件化、配置驱动与工程化沉淀，当前学习 AI Agent 应用工程化。',
    avatarText: '厉',
    hero: {
      frontImageUrl: AVATAR_FRONT,
      backImageUrl: AVATAR_BACK,
      // 旧站指向站内 AI 对话页；本仓只存不跳转（翻牌是纯视觉）
      linkUrl: '/ai-talk',
      slogans: ['热爱 Coding，生命不息，折腾不止', '羽毛球爱好者，快乐挥拍，球场飞翔'],
    },
    contact: [
      { key: 'education', label: '学历', value: '全日制本科 · 软件工程', icon: 'i-lucide-graduation-cap' },
      { key: 'years', label: '工作年限', value: '5 年', icon: 'i-lucide-hourglass' },
      { key: 'location', label: '所在地', value: '中国 四川 成都', icon: 'i-lucide-map-pin' },
      { key: 'email', label: '邮箱', value: 'lifeiyu.mock@example.com', icon: 'i-lucide-mail' },
      { key: 'phone', label: '电话', value: '13800000000', icon: 'i-lucide-phone' },
    ],
    links: [
      { label: 'GitHub', url: 'https://github.com/Fridolph', icon: 'ri:github-fill' },
      { label: '技术博客', url: 'https://example.com/blog', icon: 'ri:article-line' },
    ],
    interests: [
      { label: '羽毛球', icon: 'ri:ping-pong-line' },
      { label: '摄影', icon: 'ri:camera-line' },
    ],
  },
  highlights: [
    {
      title: '前端技术深度',
      description: '熟练掌握 Vue2/3、React、TypeScript，具备组件库、中后台与官网类项目从 0 到 1 的搭建经验。',
    },
    {
      title: '全栈交付能力',
      description: '掌握 Node.js、NestJS 与常见数据库，能独立完成前后端联调、接口设计与基础服务端模块。',
    },
    {
      title: '业务抽象能力',
      description: '善于把重复需求沉淀为公共组件、配置结构或工具能力，注重可复用、可配置、可维护。',
    },
    {
      title: '工程化实践',
      description: '熟悉 Vite/Webpack、Monorepo、CI/CD、测试与代码规范，关注工程质量与协作效率。',
    },
    {
      title: 'AI 工程化学习',
      description: '在真实开发中实践 AI 辅助编程，并学习 RAG、Agent 工作流与 SSE 流式交互等方向。',
    },
  ],
  education: [
    {
      school: '西南某理工大学',
      period: '2017.09 - 2021.06',
      degree: '全日制本科 / 学士学位',
      major: '软件工程',
    },
  ],
  experience: [
    {
      company: '成都某云科技有限公司',
      period: '2023.06 - 至今',
      role: '全栈开发（偏前端）',
      domain: 'SaaS / 企业服务 / ToB',
      overview: '负责核心产品前端架构设计与中后台开发，兼顾 Node.js 服务端模块与基础接口设计，参与组件库与配置驱动能力建设。',
      achievements: [
        '主导前端组件库与设计规范建设，沉淀 30+ 业务组件，降低多页面重复开发成本',
        '设计配置驱动的表单与列表方案，同类型页面无需重复开发',
        '使用 Node.js + NestJS 完成权限、审批等基础服务端模块，打通前后端联调链路',
        '实践 AI 辅助开发，工作流程清晰可回溯，代码生成效率提升',
      ],
      tech: ['Vue3', 'TypeScript', 'Vite', 'Node.js', 'NestJS', 'Pinia', 'TailwindCSS'],
    },
    {
      company: '成都某信息科技有限公司',
      period: '2021.07 - 2023.05',
      role: '前端开发',
      domain: '电商 / 中后台 / ToC',
      overview: '负责电商官网、活动页与管理后台开发，参与 Vue2 → Vue3 技术升级与工程化改造。',
      achievements: [
        '完成管理后台 Vue2 → Vue3 + TypeScript 重构，统一技术栈并沉淀公共组件',
        '引入 Vite 与按需加载优化打包体积与首屏性能',
        '搭建数据看板与活动配置模块，支持运营自助配置上线',
        '配合后端完成接口契约、状态管理与异常处理闭环',
      ],
      tech: ['Vue2', 'Vue3', 'TypeScript', 'Vite', 'ECharts', 'Element Plus', 'Axios'],
    },
  ],
  projects: [
    {
      name: '某 SaaS 管理平台',
      period: '2023.06 - 至今',
      role: '前端核心开发',
      overview: '面向企业客户的管理平台，涵盖权限、审批、报表、配置中心等模块，支持多租户与多角色协作。',
      features: ['权限管理', '审批流', '数据报表', '表单 / 列表配置化', '组件库'],
      highlights: [
        '设计配置驱动的表单与列表方案，同类型页面可配置生成，减少重复开发',
        '沉淀公共组件库与开发规范，提升多页面一致性与复用率',
        '通过路由懒加载、代码分割与资源优化改善首屏加载',
        '为关键接口增加错误分级与空状态处理，提升使用体验',
      ],
      tech: ['Vue3', 'TypeScript', 'Pinia', 'Vite', 'Node.js', 'NestJS', 'TailwindCSS'],
    },
    {
      name: '某电商官网与活动平台',
      period: '2021.07 - 2023.05',
      role: '前端开发',
      overview: '面向 C 端用户的电商官网与活动页平台，支持营销活动配置、商品展示与数据看板。',
      features: ['官网展示', '活动页配置', '商品列表', '数据看板', '运营后台'],
      highlights: [
        '完成官网与活动页的响应式布局与设计还原，适配移动端与桌面端',
        '将重复活动页抽象为配置模板，减少临时开发成本',
        '使用 ECharts 搭建运营数据看板，支持多维度图表展示',
        '配合后端完成下单、支付回调等链路的前端状态管理',
      ],
      tech: ['Vue3', 'TypeScript', 'Vite', 'ECharts', 'Element Plus', 'Axios'],
    },
    {
      name: 'AI 学习实验项目',
      period: '2025.01 - 至今',
      role: '个人学习',
      overview: '面向个人学习的 AI Agent 与 RAG 实验项目，用于验证文档检索、多轮问答与工具调用。',
      features: ['文档上传', '切块', '向量检索', 'RAG 问答', '引用来源返回'],
      highlights: [
        '将文档处理拆成提取、切块、向量化、检索、生成多个阶段，便于定位问题',
        '设计元数据保证检索结果可追踪',
        '理解 SSE 流式输出与多轮上下文管理',
      ],
      tech: ['Node.js', 'TypeScript', 'RAG', 'Embedding', 'SQLite'],
    },
  ],
  skills: [
    {
      group: '前端核心能力',
      items: ['Vue2/3 · Composition API', 'React · Next.js', 'TypeScript', 'TailwindCSS · Sass', 'ECharts · AntV'],
    },
    {
      group: '全栈开发能力',
      items: ['Node.js', 'NestJS · Express', 'MySQL · PostgreSQL · SQLite', 'RESTful API · JWT', 'Linux · Nginx · Docker'],
    },
    {
      group: '工程化与质量',
      items: ['Vite · Webpack', 'pnpm workspace · Turbo', 'GitHub Actions · GitLab CI', 'Vitest · Jest', '组件库沉淀'],
    },
    {
      group: 'AI 工程化学习',
      items: ['Claude Code · Cursor', 'SSE 流式输出', 'Agent 工作流', 'Prompt Engineering', 'RAG 基础'],
    },
  ],
  evaluations: [
    '5 年全栈开发经验，前端为主，兼顾服务端，能独立完成从页面到接口的完整链路',
    '重视组件化、配置驱动与工程化沉淀，倾向把重复需求抽象为可复用能力',
    '当前学习 AI Agent 应用工程化，关注 RAG、工具调用与流式交互',
    '务实、注重交付质量，乐于在真实项目中沉淀经验与方法',
  ],
  footerNote: '感谢您抽出时间阅读这份简历，期待与您进一步交流。',
}
