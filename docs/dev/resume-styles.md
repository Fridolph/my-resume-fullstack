# 简历风格维度（`minimal` / `standard`）

> 状态：**已确认，编码中**（2026-10-07 Owner 逐项选定；本轮范围见 §9）
> 关联：`Issue #13`、`dao/tasks/DAO-008-resume 风格维度.md`、[resume-display-architecture.md](./resume-display-architecture.md)、[layers.md](./layers.md)、[resume-旧站] `my-resume/apps/web/app/[locale]/_resume/*`
> 参考机制：`greensketch-basic` 的 proposal 模板切换（`app/pages/projects/[projectId]/@components/proposal/layout/ProposalModuleList.vue`、`app/composables/proposal/useThemeTemplates.ts`、`layout/templates/{Standard,Vivid,Silicon}.vue`）

## 1. 要解决的问题

展示页现在有两个正交维度，但**"区块长什么样"只有一种**：

| 维度 | 现状 | 落点 |
| --- | --- | --- |
| 编排 | `sections.order` / `slot` / `hidden`（拖拽排序、跨栏、显隐） | `ResumePageContainer` → `ResumeColumn` |
| 配色 | `theme`（合并式预设：明暗 + 主色 + 渐变） | `--resume-*` CSS 变量 |
| **风格（缺）** | 无 —— `ResumeSectionCard` 只有一种卡片外壳，`ResumeHeroCard` 只有缩略名方块 | —— |

后果：拖拽只改顺序、主题只改颜色，同一份内容无法呈现不同"视觉气质"。本设计新增**风格维度**，与上面两个维度正交。

## 2. 参考机制：GS 是怎么做的（只借鉴拆法）

GS 的 proposal 有**两个正交维度**，值得学的是"拆法"，不是它的组件：

1. **编排维度**：`useProposalPageLayout.ts` 从后端 `variablePageLayout` 解析出 `order` + `switches`，模板里用 `data-module-id` + CSS `order` 落位。
2. **模板维度**：Standard / Vivid / Silicon 三套**整页布局组件**（807 / 821 / 964 行），同一组模块用不同 wrapper 组合出不同视觉。

两个细节已被源码验证，值得写进避坑清单：

- **切换入口是"路由"组件**：`ProposalModuleList.vue` 只有一个 `<Component :is="activeTemplate">`，用**同步 `import`**。文件注释原文是"使用同步导入替代 defineAsyncComponent，避免嵌套 Suspense 追踪导致无限挂起"。
- **管理侧才异步**：`useThemeTemplates.ts` 用 `defineAsyncComponent` 做模板预览；渲染与管理分离。
- **两层风格**：整页模板决定"模块怎么摆、用什么外壳"，共享子组件再收 `template-name` 决定"自己长什么样"。

**与我们的关键差异（GS 没告诉我们这一点）**：GS 的阅读顺序靠 CSS `order` 调整，DOM 顺序由模板自己写；而我们的 `sections.order` 是**唯一编排事实源**，`ResumeColumn` 真实按序渲染 DOM（跨栏拖拽也改这份 order）。因此：

> **将来若引入整页模板组件，模板只能决定骨架与外壳，区块列表必须仍由 `ResumeColumn` 按同一份 `order` / `slot` 渲染** —— 否则整页模板会各自写一遍摆位，编排立刻失去唯一性，与拖拽功能打架。

## 3. 已确认决策

| 决策 | 理由 / 证据 | 确认者 |
| --- | --- | --- |
| 风格是独立维度，命名 `style`（类型 `ResumeStyleId`） | 与 `theme`（颜色）、`layout`（编排）语义分得最开；`template` 一词已被 Nuxt layer、admin demo、GS 占用 | Owner |
| 本轮只实现 `minimal` \| `standard` 两档 | `ResumeStyleId` 会进后端公开快照，提前塞未实现的枚举值会让前后端校验对不上 | Owner |
| 实现手段：**风格 token（CSS 变量）为主，`variant` prop 只用于结构差异** | 视觉参数（圆角 / 阴影 / 渐变 / hover / 字级）走变量则 7 个区块组件零改动，与既有主题机制同构；只有 DOM 结构不同的地方（hero 呈现、外壳标题结构）才用 `variant` | Owner |
| `standard` 向旧站 hero 贴合（含新增字段） | Owner 选择最大还原范围：头像翻牌、slogans、links、interests 都要有 | Owner |
| 翻牌头像**只做视觉**，不接跳转 | 旧站头像是指向 `/ai-talk` 的 AI 对话入口，属 `12-ai-talk` 域；feature layer 之间不得互相 import（`layers.md`），跨域能力上提须另立卡 | Owner |
| 图标沿用旧站 iconify 名，新增 `@iconify-json/ri` | 旧站内容里是 `ri:link-m` 这类名字，改写成 lucide 名会失去与旧站的可对照性；Nuxt Icon 按需 bundle，体积可控 | Owner |
| 编辑侧扩展 schema 支持**多段** | `profile` 需要"基础信息（fields）+ 链接（list）+ 兴趣（list）"，而现有 `ResumeSectionEditorSchema` 只能有一个 `mode` | Owner |
| `contact` 结构与 key 不动，只改外观 | 加 `website` 会牵动 `ResumeContactItem`、mock 与编辑 schema，与本轮"风格维度"目标无关 | Owner |
| `publishedAt` 不进 `ResumeContent` | 它是快照级元信息（`ResumeSnapshot` 的时间戳），属 C 期后端发布快照的职责；塞进内容模型会让"内容"与"发布"混层 | 归枢起草 |
| 默认 `style.id = minimal` | 保证"默认观感不变"，切换风格是显式动作 | 归枢起草 |

## 4. 契约设计

### 4.1 风格维度

```ts
/** 预设风格：决定区块「长什么样」，与 theme（颜色）、layout（编排）正交 */
export type ResumeStyleId = 'minimal' | 'standard'   // cool 在 P2 实现时再加

export interface ResumeStyleConfig {
  id: ResumeStyleId
}

export interface ResumeDisplayConfig {
  layout: ResumeLayoutConfig
  sections: ResumeSectionsConfig
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  background: ResumeBackgroundConfig
  brand: ResumeBrandConfig
  style: ResumeStyleConfig      // 本轮新增
}
```

状态层加一个动作（与 `applyTheme` / `setLayoutMode` 平级）：

```ts
function setStyle(id: ResumeStyleId) {
  config.value.style.id = id
}
```

### 4.2 内容模型增量（单语言，无字段级 locale）

```ts
interface ResumeProfile {
  // …既有 name / headline / summary / avatarText / contact
  hero: {
    frontImageUrl: string     // standard 头像正面图
    backImageUrl: string      // 翻牌背面图
    linkUrl: string           // 旧站指向 /ai-talk，本轮只存不跳转
    slogans: string[]         // 旧站 slice(0, 2)，我们最多渲染 2 条
  }
  links: { label: string, url: string, icon?: string }[]
  interests: { label: string, icon?: string }[]
}
```

映射说明：旧站是字段级 `LocalizedText`（`{ zh, en }`），本仓方向是**去 locale**，所以一律落到 `string`。

**头像回退规则**：`standard` 下有 `frontImageUrl` 用图，没有则回退 `avatarText` 文本方块；`minimal` 永远用 `avatarText`。这样编辑者不填图也不会塌。

### 4.3 区块契约：`variant` 只承载结构差异

```ts
export interface ResumeSectionProps {
  section: { key: ResumeSectionKey, label: string, icon: string }
  content: ResumeContent
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  variant: ResumeStyleId        // 本轮新增
}
```

透传链（**注意中间那一跳，最容易漏**）：

```text
ResumePageContainer  :variant="config.style.id"
  └─ ResumeColumn     :variant="variant"
       └─ <component :is="resumeSectionComponents[key]" :variant="variant" ... />
            └─ ResumeSectionCard  :variant="variant"   ← 外壳风格的主要落点
```

`variant` 走 props 而非 `provide/inject` 或全局状态：显式、可类型检查、可 grep；区块组件仍**不感知编辑态**，也不自己去读状态层。

### 4.4 编辑 schema：从单一 `mode` 改为多段

```ts
export interface ResumeFieldGroupSchema {
  mode: 'fields' | 'list'
  label: string                                  // 段标题，抽屉里显示
  listPath?: string
  titleKey?: string
  blank?: Record<string, unknown>
  fields: ResumeFieldSchema[]
}

export interface ResumeSectionEditorSchema { segments: ResumeFieldGroupSchema[] }
```

现有 7 个区块的 schema 各收编为一段，`profile` 分四段：

| 段 | mode | 内容 |
| --- | --- | --- |
| 基础信息 | fields | `profile.name` / `headline` / `avatarText` / `summary` |
| 主视觉 | fields | `profile.hero.frontImageUrl` / `backImageUrl` / `linkUrl` / `slogans`（`tags`） |
| 个人链接 | list（`profile.links`） | `label` / `url` / `icon` |
| 兴趣 | list（`profile.interests`） | `label` / `icon` |

顺带修两个现有限制：

1. `ResumeSchemaForm` 的 `listPath` 现在只按**一层**取值（`content[path]`），`profile.links` 这类嵌套路径取不到 → 改为复用 `readPath()`。
2. `ResumeSectionEditorDrawer` 里的 `listItems` computed 可以删掉：把"按段解析 root / items"下沉进 `ResumeSchemaForm`（它本来是通用表单），抽屉只留"取 schema → 保存"。

## 5. 三层落点（按成本递增，本轮只做前两层）

| 层 | 承载什么 | 手段 | 代价 |
| --- | --- | --- | --- |
| **L1 风格 token** | 卡片圆角 / 边框 / 底 / 阴影、hover 位移、间距节奏、标题字级 | CSS 变量（`--resume-card-*` 一类），由注入层与主题变量**同层下发** | 7 个区块组件零改动 |
| **L2 组件变体** | 结构差异：hero「文本方块 vs 翻牌头像」、外壳「icon + h2 vs eyebrow + title + description」 | `variant` prop（`ResumeHeroCard` / `ResumeSectionCard` 内分支） | 只动 2 个组件 + 7 处一行透传 |
| **L3 整页模板** | 页面骨架差异（cool：背景动画、视差、入场 stagger） | `templateMap` 路由 + 独立模板组件 | 重；且受 §2 末的编排约束 |

风格变量与主题变量的**注入点必须相同**（现在是 `ResumePageContainer` 的 `themeVars` computed）。将来 cool 若把容器瘦身成路由，注入层要能整体上移，不要一个变量在容器里、另一个在别处。

### 实现落点（P1 实际落地）

| 文件 | 职责 |
| --- | --- |
| `ResumePageContainer.vue` | `styleVars` computed + `data-resume-style` 属性 —— 风格变量**唯一注入点**（与 `themeVars` 同层） |
| `ResumeSectionCard.vue` | 消费 `--resume-card-*`；`variant` 决定标题结构；scoped 样式承载 hover / transition / reduced-motion |
| `ResumeHeroCard.vue` | 同上；scoped 样式另承载 3D 翻牌、渐变文字、徽标 |
| `ResumeColumn.vue` | 只透传 `variant`，不做判断 |
| 7 个 `*Section.vue` | 各一行 `:variant="variant"` 传给 `ResumeSectionCard`（L2 透传的实际代价） |

> 伪类（`:hover`）与 3D 变换**无法用 CSS 变量表达**，所以 hover / 翻牌 / `prefers-reduced-motion` 落在组件 scoped 样式里；但**颜色仍然全部取自 `--resume-*`**，所以风格与主题不会打架。本轮没有新增独立 CSS 文件。

## 6. `standard` 贴合清单

| 部位 | 目标（对照旧站） | 手段 |
| --- | --- | --- |
| hero 头像 | 圆形头像 + 翻牌（`rotateY 180deg`，0.85s）+ hover 光晕 | L2 variant 分支 + L1 token；**不接跳转**，"talk with me" 徽标保留为纯装饰 |
| hero 文案 | slogans 渐变文字（最多 2 条）、姓名 / 定位层级 | L1 token |
| hero 联系区 | 旧站是"icon + 值"的条目卡（`r-contact-item`） | L1 token 改外观；**结构与 key 不动**（不加 `website`） |
| hero 附加块 | links（icon 链接胶囊）、interests（图标 + 标签）、INTRO 卡 | L2 结构新增（本轮新字段）+ L1 token |
| 区块外壳 | eyebrow（大写小字）+ title（2xl）+ description 的三段式标题，卡片带渐变底与阴影 | L2（标题结构不同）+ L1（底色 / 阴影 / 圆角） |
| 图标 | `link.icon` / `interest.icon` 为 iconify 名（如 `ri:link-m`）；空值兜底 external-link 图标 | 新增 `@iconify-json/ri`；`<UIcon>` 渲染 |
| 动效 | hover 位移、渐变位移、光晕 | 全部以 `@media (hover: hover)` 守卫，并补 `prefers-reduced-motion` 降级（旧站没做） |

## 7. 硬约束与避坑

1. **`standard` 的 CSS 不得出现硬编码品牌色。** 旧站 `hero.css` / `published-resume-section-card.css` 里满是 `rgba(96,165,250,.1)`、`#2563eb` 这类写死的蓝；照抄会让"风格 × 主题"打架（切到「绿色清新」「深色科技」，卡片底仍是蓝的）。必须映射成派生色：
   ```css
   background: radial-gradient(circle at top left, color-mix(in srgb, var(--resume-primary) 10%, transparent), transparent 34%);
   ```
   验收项：**4 套主题 × 2 种风格全组合切一遍，无残留本色。**
2. **风格 ≠ 配色**：`style` 管"组件样子"，`theme` 管"颜色"。别把 `standard` 实现成"换一套 theme"。
3. **`variant` 只读**：区块组件不感知编辑态、不直接改配置；编辑手柄仍由 `ResumeColumn` 注入。
4. **注册表不动**：加风格不新增区块 key，`config/resume-sections.ts` 只负责"谁、在哪、第几个"。
5. **同步 import，不套 `defineAsyncComponent` + `<Suspense>`**（GS 的坑）：整页模板若这样写会无限挂起。
6. **新字段要落三处**：`types/resume.ts`、`mock/*`、`useResumeDisplay`（配置类字段）或 `mock/resume-content.zh.ts` + `config/resume-editor-schemas.ts`（内容类字段），否则 SSR / 类型检查会不一致。
7. **`variant` 会经过每一个区块组件**：`ResumeSectionCard` 是被 7 个区块组件各自使用的，所以新增一层契约字段就要各加一行透传（P1 实测成本）。这是**有意选择的代价** —— 显式优于 `provide/inject` 的隐式；不要为了省这几行改成"区块组件自己去读当前风格"，那会让区块与状态层耦合，web / admin 复用即断。
8. **`--resume-*` 的 `var()` 兜底值不是硬编码**：`ResumePageHeader` 等处写的 `var(--resume-primary, #1578d0)` 只是兜底，注入变量时不会生效。检查"是否有残留本色"时要看**实际生效值**，别被兜底字面量误判。

## 8. 分阶段落地

| 阶段 | 内容 | 本轮 |
| --- | --- | --- |
| P1 | `style.id` 类型 + mock + `setStyle`；风格 token 注入；`ResumeHeroCard` / `ResumeSectionCard` 的 `minimal` / `standard` 变体；`profile.hero` / `links` / `interests` 落内容模型与编辑 schema；设置面板加「风格」按钮组 | ✅ |
| P2 | `cool`：先做组件级动效 variant，评估是否需要整页模板组件（那时才动 L3） | 后续 |
| P3 | admin 侧风格选择与 web 渲染打通（`style.id` 纳入公开快照） | 与 admin 契约统一时一起做 |

## 9. 验收清单

1. `pnpm --filter @template/web typecheck`、`oxlint apps/web` 通过。
2. `minimal` 下页面与当前一致（默认观感不变）；`standard` 下 hero 翻牌与三段式外壳可见。
3. 临时改 mock 到 `standard` 抓 `/resume`：SSR 产物出现 standard 分支内容，无 `Failed to resolve component`。
4. **4 套主题 × 2 种风格**全组合切换，无残留本色。
5. 风格与编排正交：切风格不丢 `order` / `slot` / `hidden`；切主题不影响风格。
6. 编辑模式在两种风格下都可用：拖拽 / 显隐 / 内容编辑（含新增字段）；`profile.links` / `profile.interests` 可增删改。
7. 动效在 `prefers-reduced-motion: reduce` 下不播放。
8. 移动端（375px）：hero 翻牌与徽标不溢出。

## 10. 本轮明确不做

`cool` 风格、整页模板组件、头像跳转 / AI 对话入口、`contact` 的 key 与结构变更、图片上传、`publishedAt`、PDF、i18n、技能可视化图表、admin 侧风格选择。
