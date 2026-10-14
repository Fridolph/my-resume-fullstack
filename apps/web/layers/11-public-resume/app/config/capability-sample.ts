import type { CapabilityData } from '@rs/common'

export const capabilitySample: CapabilityData = {
  groups: [
    {
      id: 'sample-group-1',
      title: '前端核心能力',
      summary: '',
      items: [
        {
          id: 'sample-item-1-1',
          name: 'Vue 生态',
          description: '熟练掌握 Vue2/3、Nuxt、Composition API、Pinia，具备 Vue2 → Vue3 项目升级与架构迁移经验',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-1-2',
          name: 'React 生态',
          description: '具备 React Hooks、Redux、Next.js 项目开发经验，可完成 SSR/SSG 场景与中后台/官网页面搭建',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-1-3',
          name: '现代 CSS',
          description: '熟练使用 TailwindCSS、Sass/Less/Stylus，擅长响应式布局、组件化样式抽象与设计还原',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-1-4',
          name: 'JavaScript',
          description: '掌握现代 ES 标准与异步编程模型，能够编写高可读、高可维护的业务脚本与前端逻辑',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-1-5',
          name: 'TypeScript',
          description: '注重类型安全与边界约束，能够通过类型设计提升复杂项目的可维护性与协作效率',
          evidenceLinks: [],
        },
      ],
    },
    {
      id: 'sample-group-2',
      title: '全栈开发能力',
      summary: '',
      items: [
        {
          id: 'sample-item-2-1',
          name: 'Node.js',
          description: '具备 Node.js 服务端与脚本开发能力，可独立编写自动化脚本、CLI 与轻量服务',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-2-2',
          name: '服务端框架',
          description: '熟练使用 Express、NestJS，独立完成 RESTful API、JWT 认证、权限控制等中小型后端模块',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-2-3',
          name: '数据库',
          description: '具备 MySQL、MongoDB、SQLite、Drizzle ORM 使用经验，理解索引、事务与常见数据建模方式',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-2-4',
          name: '接口协同',
          description: '能够独立完成前后端联调、接口设计、数据流梳理与异常处理闭环',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-2-5',
          name: '部署基础',
          description: '具备基础 Linux、Nginx、Docker 与项目部署经验，可支撑个人项目或中小型服务上线',
          evidenceLinks: [],
        },
      ],
    },
    {
      id: 'sample-group-3',
      title: 'AI Agent 开发',
      summary: '',
      items: [
        {
          id: 'sample-item-3-1',
          name: 'AI 辅助开发',
          description:
            '高频使用 Claude Code、Cursor、Codex、Coze 等工具，形成以需求拆解、代码生成、Review 为核心的协同开发流',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-3-2',
          name: 'AI 交互',
          description: '理解 SSE 流式输出、会话管理、多轮上下文等常见 AI 应用交互模式',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-3-3',
          name: 'Agent 工作流',
          description: '从 0 到 1 搭建多 Agent 系统，理解规划、执行、验证、反馈闭环等核心机制',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-3-4',
          name: 'Prompt Engineering',
          description: '能够设计结构化 Prompt 模板，提升输出稳定性、准确率与可复用性',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-3-5',
          name: '技术输出',
          description: '持续进行 AI Agent 开发学习与内容输出，具备将实践沉淀为文章/教程的能力',
          evidenceLinks: [],
        },
      ],
    },
    {
      id: 'sample-group-4',
      title: '工程化与性能优化',
      summary: '',
      items: [
        {
          id: 'sample-item-4-1',
          name: '构建体系',
          description: '熟悉 Webpack、Vite 配置与脚手架搭建，具备前端工程初始化与构建链路优化经验',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-4-2',
          name: 'Monorepo',
          description: '实践 pnpm workspace、Turbo 等方案，能够完成多应用/多包项目的结构设计与脚本编排',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-4-3',
          name: 'CI/CD',
          description: '具备 GitLab CI、GitHub Actions、Jenkins 使用经验，能够搭建基础自动化构建与部署流程',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-4-4',
          name: '性能调优',
          description: '熟悉 Chrome DevTools、Performance 等工具，可定位首屏、渲染、资源加载等常见性能问题',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-4-5',
          name: '测试与质量',
          description: '具备 Jest、Vitest、TDD 基础，能够编写组件与模块级单元测试，保障重构稳定性',
          evidenceLinks: [],
        },
      ],
    },
    {
      id: 'sample-group-5',
      title: '业务理解与产品化落地',
      summary: '',
      items: [
        {
          id: 'sample-item-5-1',
          name: '需求理解',
          description: '能够快速理解业务目标，将需求拆解为页面、组件、接口与交互任务',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-5-2',
          name: '产品化意识',
          description: '关注功能是否可复用、可配置、可维护，而非只完成一次性交付',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-5-3',
          name: '业务抽象',
          description: '能够从具体需求中提炼通用模型，沉淀为公共组件、配置结构或工具能力',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-5-4',
          name: '跨端协同',
          description: '具备前后端协作意识，能推动接口、状态、交互与异常处理形成完整闭环',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-5-5',
          name: '结果导向',
          description: '关注交付质量、用户体验与迭代效率，能够在有限资源下优先解决核心问题',
          evidenceLinks: [],
        },
      ],
    },
    {
      id: 'sample-group-6',
      title: '架构设计与技术方案',
      summary: '',
      items: [
        {
          id: 'sample-item-6-1',
          name: '前端架构设计',
          description: '能够完成中后台 / 官网 / Monorepo 项目的目录分层、模块边界与公共能力抽象',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-6-2',
          name: '技术方案输出',
          description: '可根据业务场景进行方案选型，对状态管理、SSR、组件复用、权限控制等给出可落地设计',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-6-3',
          name: '重构与演进',
          description: '具备旧项目渐进式重构经验，可在保证业务连续性的前提下推进技术升级',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-6-4',
          name: '组件与规范建设',
          description: '能够设计公共组件、工具函数、类型约束与开发规范，提升项目一致性与复用率',
          evidenceLinks: [],
        },
        {
          id: 'sample-item-6-5',
          name: '问题定位与权衡',
          description: '面对复杂需求时，能在开发效率、可维护性、扩展性之间做合理取舍',
          evidenceLinks: [],
        },
      ],
    },
  ],
  ratingScale: {
    min: 0,
    max: 100,
    basis: '',
  },
  dimensions: [
    {
      id: 'sample-dimension-1',
      label: '前端核心能力',
      groupId: 'sample-group-1',
      score: null,
    },
    {
      id: 'sample-dimension-2',
      label: '全栈开发能力',
      groupId: 'sample-group-2',
      score: null,
    },
    {
      id: 'sample-dimension-3',
      label: 'AI Agent 开发',
      groupId: 'sample-group-3',
      score: null,
    },
    {
      id: 'sample-dimension-4',
      label: '工程化与性能优化',
      groupId: 'sample-group-4',
      score: null,
    },
    {
      id: 'sample-dimension-5',
      label: '业务理解与产品化落地',
      groupId: 'sample-group-5',
      score: null,
    },
    {
      id: 'sample-dimension-6',
      label: '架构设计与技术方案',
      groupId: 'sample-group-6',
      score: null,
    },
  ],
}
