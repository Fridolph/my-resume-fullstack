/**
 * 简历内容 mock 数据（demo 用）—— 与布局配置解耦。
 *
 * 对标 greensketch：`proposalDetail`（内容）与 `customSettings`（排版配置）分离。
 * 这里 `RESUME_CONTENT` 是内容，`useResumeLayout` 的 order/switches/theme 是配置。
 */

export interface ResumeExperience {
  company: string;
  role: string;
  period: string;
  description: string;
}

export interface ResumeProject {
  name: string;
  role: string;
  period: string;
  description: string;
  tech: string[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  major: string;
  period: string;
}

export interface ResumeContent {
  name: string;
  role: string;
  avatar: string;
  phone: string;
  email: string;
  location: string;
  age: number;
  website: string;
  summary: string;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  skills: string[];
  certificates: string[];
  languages: { lang: string; level: string }[];
  hobbies: string[];
}

export const RESUME_CONTENT: ResumeContent = {
  name: "张三",
  role: "高级前端工程师",
  avatar: "张",
  phone: "138-0000-0000",
  email: "zhangsan@example.com",
  location: "杭州",
  age: 30,
  website: "https://zhangsan.dev",
  summary:
    "5 年前端开发经验，专注 Vue/Nuxt 与前端工程化，主导过组件库、低代码表单与多页文档（提案/简历）导出等方向；注重代码质量与可维护性，擅长把复杂业务拆成可复用、可配置的模块。",
  experience: [
    {
      company: "某互联网大厂",
      role: "高级前端工程师",
      period: "2022.06 - 至今",
      description:
        "负责中后台组件库与设计系统建设，沉淀 40+ 业务组件；推动微前端与 Nuxt Layer 模块化改造。",
    },
    {
      company: "某科技公司",
      role: "前端工程师",
      period: "2020.07 - 2022.05",
      description:
        "参与光伏报价/提案平台开发，独立负责用电信息采集与报价模块；封装通用轮询、防抖计算等基础设施。",
    },
  ],
  projects: [
    {
      name: "简历生成器（my-resume）",
      role: "架构 & 开发",
      period: "2026",
      description:
        "配置驱动的简历排版：模块拖拽排序、预设主题、A4 分页导出；借鉴提案系统的布局配置与 PDF 导出链路。",
      tech: ["Nuxt 4", "Vue 3", "Tailwind", "TypeScript"],
    },
    {
      name: "光伏提案系统",
      role: "前端核心",
      period: "2025",
      description:
        "提案主题切换、模块显隐排序、quote 报价明细与 PDF/Invoice 输出，网页与 PDF 同源同配置。",
      tech: ["Nuxt 3", "PrimeVue", "Pinia"],
    },
  ],
  education: [
    {
      school: "某大学",
      degree: "本科",
      major: "软件工程",
      period: "2016.09 - 2020.06",
    },
  ],
  skills: [
    "Vue / Nuxt",
    "TypeScript",
    "Node.js",
    "Tailwind / UnoCSS",
    "Pinia",
    "Vitest",
    "工程化 / 组件库",
  ],
  certificates: ["软考中级 · 软件设计师", "CET-6"],
  languages: [
    { lang: "中文", level: "母语" },
    { lang: "英语", level: "CET-6 · 可协作" },
  ],
  hobbies: ["开源", "摄影", "骑行"],
};
