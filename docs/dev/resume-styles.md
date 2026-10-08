# 简历风格维度（`minimal` / `standard`）

> 状态：**已确认，编码中**（2026-10-07 Owner 逐项选定；本轮范围见 §9）
> 关联：`Issue #13`、`dao/tasks/DAO-008-resume 风格维度.md`、[resume-display-architecture.md](./resume-display-architecture.md)、[layers.md](./layers.md)、[resume-旧站] `my-resume/apps/web/app/[locale]/_resume/*`
> 参考机制：`greensketch-basic` 的 proposal 模板切换（`app/pages/projects/[projectId]/@components/proposal/layout/ProposalModuleList.vue`、`app/composables/proposal/useThemeTemplates.ts`、`layout/templates/{Standard,Vivid,Silicon}.vue`）

## 1. 要解决的问题

展示页现在有两个正交维度，但**"区块长什么样"只有一种**：

| 维度           | 现状                                                                        | 落点                                   |
| -------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| 编排           | `sections.order` / `slot` / `hidden`（拖拽排序、跨栏、显隐）                | `ResumePageContainer` → `ResumeColumn` |
| 配色           | `theme`（合并式预设：明暗 + 主色 + 渐变）                                   | `--resume-*` CSS 变量                  |
| **风格（缺）** | 无 —— `ResumeSectionCard` 只有一种卡片外壳，`ResumeHeroCard` 只有缩略名方块 | ——                                     |

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

| 决策                                                                    | 理由 / 证据                                                                                                                                                    | 确认者   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 风格是独立维度，命名 `style`（类型 `ResumeStyleId`）                    | 与 `theme`（颜色）、`layout`（编排）语义分得最开；`template` 一词已被 Nuxt layer、admin demo、GS 占用                                                          | Owner    |
| 本轮只实现 `minimal` \| `standard` 两档                                 | `ResumeStyleId` 会进后端公开快照，提前塞未实现的枚举值会让前后端校验对不上                                                                                     | Owner    |
| 实现手段：**风格 token（CSS 变量）为主，`variant` prop 只用于结构差异** | 视觉参数（圆角 / 阴影 / 渐变 / hover / 字级）走变量则 7 个区块组件零改动，与既有主题机制同构；只有 DOM 结构不同的地方（hero 呈现、外壳标题结构）才用 `variant` | Owner    |
| `standard` 向旧站 hero 贴合（含新增字段）                               | Owner 选择最大还原范围：头像翻牌、slogans、links、interests 都要有                                                                                             | Owner    |
| 翻牌头像**只做视觉**，不接跳转                                          | 旧站头像是指向 `/ai-talk` 的 AI 对话入口，属 `12-ai-talk` 域；feature layer 之间不得互相 import（`layers.md`），跨域能力上提须另立卡                           | Owner    |
| 图标沿用旧站 iconify 名，新增 `@iconify-json/ri`                        | 旧站内容里是 `ri:link-m` 这类名字，改写成 lucide 名会失去与旧站的可对照性；Nuxt Icon 按需 bundle，体积可控                                                     | Owner    |
| 编辑侧扩展 schema 支持**多段**                                          | `profile` 需要"基础信息（fields）+ 链接（list）+ 兴趣（list）"，而现有 `ResumeSectionEditorSchema` 只能有一个 `mode`                                           | Owner    |
| `contact` 结构与 key 不动，只改外观                                     | 加 `website` 会牵动 `ResumeContactItem`、mock 与编辑 schema，与本轮"风格维度"目标无关                                                                          | Owner    |
| `publishedAt` 不进 `ResumeContent`                                      | 它是快照级元信息（`ResumeSnapshot` 的时间戳），属 C 期后端发布快照的职责；塞进内容模型会让"内容"与"发布"混层                                                   | 归枢起草 |
| 默认 `style.id = minimal`                                               | 保证"默认观感不变"，切换风格是显式动作                                                                                                                         | 归枢起草 |

## 4. 契约设计

### 4.1 风格维度

```ts
/** 预设风格：决定区块「长什么样」，与 theme（颜色）、layout（编排）正交 */
export type ResumeStyleId = 'minimal' | 'standard' // cool 在 P2 实现时再加

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
  style: ResumeStyleConfig // 本轮新增
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
    frontImageUrl: string // standard 头像正面图
    backImageUrl: string // 翻牌背面图
    linkUrl: string // 旧站指向 /ai-talk，本轮只存不跳转
    slogans: string[] // 旧站 slice(0, 2)，我们最多渲染 2 条
  }
  links: { label: string; url: string; icon?: string }[]
  interests: { label: string; icon?: string }[]
}
```

映射说明：旧站是字段级 `LocalizedText`（`{ zh, en }`），本仓方向是**去 locale**，所以一律落到 `string`。

**头像回退规则**：`standard` 下有 `frontImageUrl` 用图，没有则回退 `avatarText` 文本方块；`minimal` 永远用 `avatarText`。这样编辑者不填图也不会塌。

### 4.3 区块契约：`variant` 只承载结构差异

```ts
export interface ResumeSectionProps {
  section: { key: ResumeSectionKey; label: string; icon: string }
  content: ResumeContent
  options: ResumeDisplayOptions
  theme: ResumeThemeConfig
  variant: ResumeStyleId // 本轮新增
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
  label: string // 段标题，抽屉里显示
  listPath?: string
  titleKey?: string
  blank?: Record<string, unknown>
  fields: ResumeFieldSchema[]
}

export interface ResumeSectionEditorSchema {
  segments: ResumeFieldGroupSchema[]
}
```

现有 7 个区块的 schema 各收编为一段，`profile` 分四段：

| 段       | mode                        | 内容                                                                            |
| -------- | --------------------------- | ------------------------------------------------------------------------------- |
| 基础信息 | fields                      | `profile.name` / `headline` / `avatarText` / `summary`                          |
| 主视觉   | fields                      | `profile.hero.frontImageUrl` / `backImageUrl` / `linkUrl` / `slogans`（`tags`） |
| 个人链接 | list（`profile.links`）     | `label` / `url` / `icon`                                                        |
| 兴趣     | list（`profile.interests`） | `label` / `icon`                                                                |

顺带修两个现有限制：

1. `ResumeSchemaForm` 的 `listPath` 现在只按**一层**取值（`content[path]`），`profile.links` 这类嵌套路径取不到 → 改为复用 `readPath()`。
2. `ResumeSectionEditorDrawer` 里的 `listItems` computed 可以删掉：把"按段解析 root / items"下沉进 `ResumeSchemaForm`（它本来是通用表单），抽屉只留"取 schema → 保存"。

## 5. 三层落点（按成本递增，本轮只做前两层）

| 层                | 承载什么                                                                                   | 手段                                                               | 代价                         |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------- |
| **L1 风格 token** | 卡片圆角 / 边框 / 底 / 阴影、hover 位移、间距节奏、标题字级                                | CSS 变量（`--resume-card-*` 一类），由注入层与主题变量**同层下发** | 7 个区块组件零改动           |
| **L2 组件变体**   | 结构差异：hero「文本方块 vs 翻牌头像」、外壳「icon + h2 vs eyebrow + title + description」 | `variant` prop（`ResumeHeroCard` / `ResumeSectionCard` 内分支）    | 只动 2 个组件 + 7 处一行透传 |
| **L3 整页模板**   | 页面骨架差异（cool：背景动画、视差、入场 stagger）                                         | `templateMap` 路由 + 独立模板组件                                  | 重；且受 §2 末的编排约束     |

风格变量与主题变量的**注入点必须相同**（现在是 `ResumePageContainer` 的 `themeVars` computed）。将来 cool 若把容器瘦身成路由，注入层要能整体上移，不要一个变量在容器里、另一个在别处。

### 实现落点（P1 实际落地）

| 文件                      | 职责                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `ResumePageContainer.vue` | `styleVars` computed + `data-resume-style` 属性 —— 风格变量**唯一注入点**（与 `themeVars` 同层）    |
| `ResumeSectionCard.vue`   | 消费 `--resume-card-*`；`variant` 决定标题结构；scoped 样式承载 hover / transition / reduced-motion |
| `ResumeHeroCard.vue`      | 同上；scoped 样式另承载 3D 翻牌、渐变文字、徽标                                                     |
| `ResumeColumn.vue`        | 只透传 `variant`，不做判断                                                                          |
| 7 个 `*Section.vue`       | 各一行 `:variant="variant"` 传给 `ResumeSectionCard`（L2 透传的实际代价）                           |

> 伪类（`:hover`）与 3D 变换**无法用 CSS 变量表达**，所以 hover / 翻牌 / `prefers-reduced-motion` 落在组件 scoped 样式里；但**颜色仍然全部取自 `--resume-*`**，所以风格与主题不会打架。本轮没有新增独立 CSS 文件。

## 6. `standard` 贴合清单

| 部位        | 目标（对照旧站）                                                                           | 手段                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| hero 头像   | 圆形头像 + 翻牌（`rotateY 180deg`，0.85s）+ hover 光晕                                     | L2 variant 分支 + L1 token；**不接跳转**，"talk with me" 徽标保留为纯装饰           |
| hero 文案   | slogans 渐变文字（最多 2 条）、姓名 / 定位层级                                             | L1 token                                                                            |
| hero 联系区 | 旧站是"icon + 值"的条目卡（`r-contact-item`）                                              | L1 token 改外观；**结构与 key 不动**（不加 `website`）                              |
| hero 附加块 | links（icon 链接胶囊）、interests（图标 + 标签）、INTRO 卡                                 | L2 结构新增（本轮新字段）+ L1 token                                                 |
| 区块外壳    | eyebrow（大写小字）+ title（2xl）+ description 的三段式标题，卡片带渐变底与阴影            | L2（标题结构不同）+ L1（底色 / 阴影 / 圆角）                                        |
| 图标        | `link.icon` / `interest.icon` 为 iconify 名（如 `ri:link-m`）；空值兜底 external-link 图标 | 新增 `@iconify-json/ri`；`<UIcon>` 渲染                                             |
| 动效        | hover 位移、渐变位移、光晕                                                                 | 全部以 `@media (hover: hover)` 守卫，并补 `prefers-reduced-motion` 降级（旧站没做） |

## 7. 硬约束与避坑

1. **`standard` 的 CSS 不得出现硬编码品牌色。** 旧站 `hero.css` / `published-resume-section-card.css` 里满是 `rgba(96,165,250,.1)`、`#2563eb` 这类写死的蓝；照抄会让"风格 × 主题"打架（切到「绿色清新」「深色科技」，卡片底仍是蓝的）。必须映射成派生色：
   ```css
   background: radial-gradient(
     circle at top left,
     color-mix(in srgb, var(--resume-primary) 10%, transparent),
     transparent 34%
   );
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

| 阶段 | 内容                                                                                                                                                                                                                  | 本轮                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| P1   | `style.id` 类型 + mock + `setStyle`；风格 token 注入；`ResumeHeroCard` / `ResumeSectionCard` 的 `minimal` / `standard` 变体；`profile.hero` / `links` / `interests` 落内容模型与编辑 schema；设置面板加「风格」按钮组 | ✅                        |
| P2   | `cool`：先做组件级动效 variant，评估是否需要整页模板组件（那时才动 L3）                                                                                                                                               | 后续                      |
| P3   | admin 侧风格选择与 web 渲染打通（`style.id` 纳入公开快照）                                                                                                                                                            | 与 admin 契约统一时一起做 |

## 9. 验收清单

1. `pnpm --filter @template/web typecheck`、`oxlint apps/web` 通过。
2. `minimal` 下页面与当前一致（默认观感不变）；`standard` 下 hero 翻牌与三段式外壳可见。
3. 临时改 mock 到 `standard` 抓 `/resume`：SSR 产物出现 standard 分支内容，无 `Failed to resolve component`。
4. **4 套主题 × 2 种风格**全组合切换，无残留本色。
5. 风格与编排正交：切风格不丢 `order` / `slot` / `hidden`；切主题不影响风格。
6. 编辑模式在两种风格下都可用：拖拽 / 显隐 / 内容编辑（含新增字段）；`profile.links` / `profile.interests` 可增删改。
7. 动效在 `prefers-reduced-motion: reduce` 下不播放。
8. 移动端（375px）：hero 翻牌与徽标不溢出。

## 10. 主题配色与自定义（2026-10-08 追加，同日修订）

> 关联：`Issue #18`、`dao/tasks/DAO-012-web 简历页主题与自定义调色盘.md`

### 10.1 三栏宽度改为固定 300px

三栏模式左右两栏从比例制 `1fr 4fr 1fr` 改为**固定 300px**：`lg:grid-cols-[300px_minmax(0,1fr)_300px]`；
只有一侧时分别退化为 `[300px_minmax(0,1fr)]` / `[minmax(0,1fr)_300px]`。
split 的两档（`320/360`，wide `380/420`）与 single 的 `max-w-4xl` 限宽**保持不变**。

### 10.2 主题模型：配色预设 × 明暗（对早期决策的修订）

**这条推翻了 `DAO-007` 阶段的决定。** 当时 Owner 选的是「保持合并式预设，不做 `mode × preset` 拆分」
（见 [resume-display-architecture.md](./resume-display-architecture.md) §3.3），但实际用下来问题明确：

- 「深色科技」把**明暗**和**配色**压成了一个维度：想要「蓝色 + 深色」做不到；
- 系统里没有一个「浅色 / 深色」的独立开关。

现在的模型（正交两维）：

```ts
export type ResumeColorMode = 'light' | 'dark'

export interface ResumeThemePalette {
  primary
  gradientFrom
  gradientTo
  surface
  text
  muted
  border
  chipBg
  chipText
}

export interface ResumeThemePreset {
  id: string
  label: string
  light: ResumeThemePalette // 每套预设自带两组色值
  dark: ResumeThemePalette
}

export interface ResumeThemeConfig extends ResumeThemePreset {
  mode: ResumeColorMode // 当前生效的明暗
}
```

- **生效色值 = `theme[theme.mode]`**；页面注入、`--resume-page` 渐变、背景层遮罩全部由 `mode` 决定
  （不再有那个语义混杂的 `dark` 布尔）。
- 3 套预设各自**自带两组**：
  | 预设 | 浅色组 | 深色组 |
  | --- | --- | --- |
  | 蓝色简约 | `#1578d0` + 白底、`#0f172a` 正文 | `#60a5fa` + `#111827` 底 |
  | 绿色清新 | `#2f9e63` + 白底 | `#4ade80` + `#111827` 底 |
  | **科技感** | 冷调浅底 `#f8fafc` + 青蓝 `#0891b2` | **纯黑底 `#000000`** + 青色高光 `#22d3ee` |
- **切预设保留当前明暗**：「绿色 + 深色」本身是合理组合，不该被重置。

### 10.3 自定义与调色盘

- 「自定义」= 复制当前预设的**两组**值 + 换 `id: 'custom'`。
- 调色盘**两组平铺**（浅色 / 深色各 9 项，共 18 行）：预设态只读（色块 + hex），
  自定义态可编辑（hex 输入 + `UColorPicker`）；编辑的是**所在那一组**（`setThemeField(mode, key, value)`）。
- 明暗切换在面板上**独立一行**（浅色 / 深色按钮），与配色按钮组分开。
- 组件仍是 Nuxt UI 自带的 `UColorPicker`（`modelValue: String`，默认 `format="hex"`）+ `UPopover` 收纳。
  > ui.nuxt.com/theme 那套完整编辑器是 **docs 站的实现，不是 npm 组件**，不能直接 import。
- 因为 `--resume-primary` 是项目自己的 CSS 变量（**不是** Nuxt UI 的 color alias），自定义可以直接用任意 hex ——
  不受 Nuxt UI「`app.config.ts` 只能用命名调色板」那条限制。

### 10.4 旧本地配置迁移

主题模型改过三轮：① 颜色由 `dark` 派生 → ② 9 个颜色平铺在 theme 顶层 → ③ 预设 × 明暗两组。
`normalizeTheme` 负责把旧数据搬过来：

1. 认得出 `id` → 用该预设补底；认不出（如已删的 `business`、旧 id `light`）→ 回退首个预设；
2. `source.light` / `source.dark` 是完整 palette → 用它覆盖预设对应组；
3. 旧结构里**平铺在顶层**的那批色值 → 放到 `mode` 指向的那一组（尽量保住用户当时的观感）；
4. `mode` 从 `mode` 字段或旧的 `dark` 布尔推断。

不做这步的话，旧 localStorage 会让新变量变成 `undefined`，页面直接失色。

### 10.5 验证要点（含 SSR 的坑）

- 三栏：SSR 里应出现 `lg:grid-cols-[300px_minmax(0,1fr)_300px]`。
- 明暗：切 `mode` 后 body 上的 `--resume-primary / --resume-surface` 应换成**另一组**的值
  （如 `tech + dark` → `--resume-surface:#000000`）。
- 面板：**`UDrawer` / `UModal` 在 SSR 不渲染内容** —— 要验证面板得临时把内容直出（之后 `git checkout` 还原）。
- 抓取点：9 个字段标签各出现 2 次（两组平铺）、明暗按钮存在、**不含已删预设的文案**、无 `Failed to resolve component` / `NUXT_E*`。

## 11. `pro`（精致）风格（2026-10-08 追加）

> 关联：`Issue #21`、`dao/tasks/DAO-014-web 简历页 pro 风格与 hero 拆分.md`

### 11.1 定位与分期

| 档         | 定位                                                                   | 状态                         |
| ---------- | ---------------------------------------------------------------------- | ---------------------------- |
| `minimal`  | 极简：文本方块 + 列表                                                  | ✅                           |
| `standard` | 标准：翻牌头像 + 分块 + eyebrow（对齐旧站）                            | ✅                           |
| `pro`      | 精致：**展示形式的维度转换**（tooltip / 折叠 / 3D / 图表联动，见 §14） | ✅ hero 已重做；其余区块待补 |

动效与交互**已按 §14 的新定位在 hero 上落地**（入场 stagger / hover 联动 / 3D 倾斜 / 折叠 / tooltip）；其余区块按同一思路待补。

### 11.2 实现方式：入口薄壳 + 三档实现（一次明确的取舍）

```text
components/resume/
├── ResumeHeroCard.vue          # 薄壳：契约 + .resume-card 外壳 + variant 路由（43 行）
└── hero/
    ├── ResumeHeroMinimal.vue
    ├── ResumeHeroStandard.vue
    └── ResumeHeroPro.vue
```

**为什么 hero 拆、而 `ResumeSectionCard` 不拆**：

|          | hero                                  | ResumeSectionCard               |
| -------- | ------------------------------------- | ------------------------------- |
| 使用处   | 全站 **1 处**                         | 被 **7 个区块**复用             |
| 差异性质 | **结构差异大**（画廊/雷达 vs 文本块） | 仅标题结构（色条 vs icon）      |
| 拆分代价 | 无同步成本                            | 抽变体要同步 7 处               |
| 结论     | **拆**（薄壳 + 三实现）               | **不拆**（外壳共用 + 结构分支） |

判据（下次同类选择按这四条走）：① 使用处数量 ② 共享比例 ③ 差异是"参数"还是"结构" ④ 独立演进速度。

> 注意：这里拆的是**组件内部实现**，`ResumeHeroCard` 对外的 `ResumeSectionProps` 契约、注册表项、编辑/拖拽注入方式**都没变** —— 所以拆与不拆对 admin 复用没有影响。

### 11.3 `pro` 新增的内容字段（全部可选）

```ts
interface ResumeProfile {
  // …既有 name / headline / summary / avatarText / hero / contact / links / interests
  availability?: string // 求职状态徽标文案，留空则不展示
  stats?: ResumeProfileStat[] // { label, value, hint? } 数字块
  gallery?: ResumeProfileGalleryItem[] // { url, alt? } 形象画廊（本轮只建模 + 展示 URL）
  radar?: ResumeProfileRadarItem[] // { label, value: 0~100 } 能力雷达
}
```

- **全部可选**：旧内容 / 旧 localStorage 里没有它们，组件侧用 `?? []` + `v-if` 容错，**不需要写迁移**。
- 能力雷达**不引入图表库**：用 SVG 手绘（三角函数算顶点 + 底图多边形），维度少于 3 个时不画。
- 编辑侧：`resume-editor-schemas.ts` 的 `profile` 段新增三段（数据块 / 能力雷达 / 形象画廊），
  并新增字段类型 `number`（`ResumeFieldInput` 里的数字输入，`emit(Number(...))` 保证存进去是数字）。

### 11.4 排版约束：按「窄栏」设计

hero 默认落在 `side` 栏（300px），所以 pro 的版式**刻意不用视口断点** ——
栏宽 ≠ 视口宽，`:sm` 这类断点会在窄栏里也命中、把内容挤坏。
现状：画廊 2 列、数字块单列、雷达 120px + 右侧图例。
若将来要"宽栏更铺开"，应改用**容器查询**（Tailwind v4 的 `@container` + `@[Npx]:` 变体）。

### 11.5 验证要点

- 三档各抓一次 SSR：`data-style="minimal|standard|pro"` 下分支内容正确、无告警。
- `pro` 额外看：画廊图片数量、`Capability` 段是否出现（`radar ≥ 3` 时）、求职状态徽标。
- 编辑抽屉：新增三段可增删改，`number` 字段落库为数字而非字符串。

## 12. 风格实现架构与判据（2026-10-08 追加）

> 关联：`Issue #23`、`dao/tasks/DAO-015-pro 风格铺到区块（架构 + experience-skills 示范）.md`。
> 判据部分承 `DAO-014`（hero 拆分）。这一节回答「**一个组件在 3 档风格下该怎么组织**」，后续所有区块按它执行。

### 12.1 三手段分层（不是三选一，而是按成本从低到高）

| 手段                                                 | 表达什么差异                                                          | 成本                           | 何时用                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| **① CSS token**（`--resume-*` + `.resume-*` 语义类） | 可参数化的一切：圆角 / 内边距 / 阴影 / 表面 / hover / 字级 / 间距节奏 | **0**（组件不改）              | **默认**。新增风格先问「这差异能不能变成变量」，能就别碰组件 |
| **② 同一组件内的 `variant` 数据映射**                | 局部 DOM 差异（标题行组成、某块的装饰）                               | 1 处                           | 差异 < 模板 30%，或该组件被多处复用                          |
| **③ 拆文件：薄壳 + 一风格一文件**                    | 整块结构差异（hero 的画廊/雷达、experience 的时间线）                 | N 文件 + 共享数据抽 composable | 满足 12.2 判据任两条                                         |
| **③′ 抽「零件」子组件**                              | 中间态：骨架相同、个别零件不同                                        | 中                             | 同一零件在**多处**复用（见 12.4）                            |

### 12.2 判据：拆 or 不拆

满足任意两条 → 拆：

1. **使用处 ≤ 2**（使用处多，拆开就要同步多处）
2. **与其它档的共享模板 < 50%**
3. **差异是整块结构**，而不是局部装饰
4. **该档在快速迭代**（独立文件让它能单独演进）

对照组（方向相反、各有依据）：

|        | `ResumeHeroCard`                  | `ResumeSectionCard`             |
| ------ | --------------------------------- | ------------------------------- |
| 使用处 | 1 处                              | 被 7 个区块复用                 |
| 差异   | 整块结构（画廊 / 雷达 vs 文本块） | 仅标题结构                      |
| 结论   | **拆**（薄壳 + `hero/` 三档）     | **不拆**（外壳共用 + 数据映射） |

### 12.3 目录与命名约定

```text
components/resume/
├── Resume<Section>Section.vue      # 薄壳：接契约、挂外壳、按 variant 路由（不写内容细节）
├── <section>/                      # 该区块的全部风格实现放进一个目录
│   ├── Resume<Section>Minimal.vue
│   ├── Resume<Section>Standard.vue
│   ├── Resume<Section>Pro.vue
│   └── parts/                      # 可选：该区块的**零件**（见下）
└── hero/                           # hero 同构（它不用 ResumeSectionCard，薄壳自己挂外壳）
```

- 薄壳用 **`Record<ResumeStyleId, Component>`** 路由，不是 `if/else`；
- 三档实现接收 **`ResumeSectionBodyProps`**（`content` / `options` / `variant`）—— 没有 `section` / `theme`，
  因为标题与外观由外壳统一消费。
- **`parts/` 子目录（2026-10-08 新增，hero 先行）**：当某一档变成"多个可独立演进的零件"时，
  把零件放进 `<section>/parts/`，档位文件退回**纯组装**。判据是"零件是否有自己的数据/交互/样式"
  —— 满足就放 `parts/`，不满足就别拆（否则只是把行数搬家）。
  零件仍收 `ResumeSectionBodyProps`，并自己 `use<Section>(props)` 取数据，不由档位逐层透传。
  回滚方式：把 `parts/` 里的文件移回 `<section>/` 并改 import（无契约变化）。

### 12.4 样式归属：零件放哪

| 类型                         | 放哪                                           | 例                                                                                             |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **跨区块复用的「风格语言」** | `app/assets/css/resume.css` 的 `.resume-pro-*` | `.resume-pro-block` / `-row` / `-chip` / `-stats`（原在 `ResumeHeroPro` 的 scoped 里，已上提） |
| **该区块独有的零件**         | 组件内 `<style scoped>`                        | `experience` 的时间线、`skills` 的组头细线                                                     |
| **三档共用的派生数据**       | composable                                     | `useHero`（hero 三档 + 零件的唯一数据入口）                                                    |

判断标准只有一条：**是不是第二个地方也要用**。不是 → 留 scoped，等真复用再抽。

### 12.5 三档内容必须「确有差异」

拆文件不能拆成复制粘贴。三档的语言分工：

| 档         | 语言                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `minimal`  | 克制：文本流、一行连接（`a · b · c`）、无装饰                         |
| `standard` | 结构：时间列 + 层级标题 + 标签墙（对齐旧站）                          |
| `pro`      | 讲究：时间线 / 组头层级 / 圆角零件 / 数字块 —— 靠层级与留白，不堆装饰 |

### 12.6 止损线

- 任一区块的三档实现出现 **> 50% 重复** → 回头抽 composable 或零件，不许继续复制；
- **加第三档时若代码里出现 `x === 'standard' ? … : …` 这类布尔判断 → 立刻改数据映射**
  （本项目真实踩过：`ResumeSectionCard` 与 `CARD_STYLE` 原先都是布尔，加 `pro` 会**静默掉进 `minimal`**）。

## 13. 本轮明确不做

`cool` 风格、整页模板组件、头像跳转 / AI 对话入口、`contact` 的 key 与结构变更、图片上传、`publishedAt`、PDF、i18n、技能可视化图表、admin 侧风格选择。

## 14. `pro` 的定位：展示形式的**维度转换**（2026-10-08 重设）

> 关联：`Issue #24`、`dao/tasks/DAO-016-*.md`（hero 打样）。
> §11 当时写的是「版式更讲究」，Owner 实看后判定**精致感没出来**；定位据此重设为下面这条。

### 14.1 一句话定位

> `pro` = **在 `standard` 之上，把同一份信息换一种维度去呈现**；文字仍是主体，
> 变的是「展示形式」，不是「装饰数量」。

- **不是**：堆动画、堆渐变、堆阴影、堆图标；
- **是**：同一份数据的另一种读法 —— 能悬停展开的、能折叠收起的、能跟随三维的、能联动图表的。

### 14.2 手法清单（按「是不是维度转换」筛）

| 手法               | 维度转换在哪                           | hero 已落地                                                 |
| ------------------ | -------------------------------------- | ----------------------------------------------------------- |
| **压缩 + tooltip** | 空间：默认只占一行，需要时给完整信息   | 联系方式 = 图标 + 截断值胶囊 → hover 出完整值 → 点击复制    |
| **折叠 / 展开**    | 注意力：长文默认收起，读者决定何时展开 | INTRO 超长时 `line-clamp` + 展开按钮（带过渡）              |
| **三维动效**       | 空间感：平面 → 有纵深                  | 画廊鼠标跟随倾斜（≤ 8°）+ 跟随高光，移开平滑归位            |
| **图表化**         | 数量：文字 → 形状                      | 能力雷达（SVG 手绘，不引库）                                |
| **图表联动**       | 交互：图与表互相点亮                   | hover 图例 ↔ 轴 / 顶点 / 数值同时高亮（键盘 `@focus` 同效） |
| **状态与反馈**     | 时间：静态 → 有反应                    | 复制成功图标切换、求职状态脉动点、卡片与 chip 的 hover 抬升 |
| **入场 stagger**   | 节奏：一次出现 → 依次出现              | 各块 `animation-delay: calc(var(--i) * 70ms)`               |

### 14.3 不算「维度转换」的做法（别做）

1. 只是把颜色 / 阴影 / 圆角调得更花 —— 那属于 **token**（§12.1 手段 ①），别占用 pro 的差异额度；
2. 纯装饰的粒子 / 光斑 / 背景循环动画 —— 与信息无关；
3. 为动而动的循环动画（承担「状态」含义的除外，如脉动点）；
4. 动到影响可读性：位移过大、过渡过慢、闪烁。

### 14.4 硬约束

1. **文字仍是主体**：交互不能把信息变成「只有 hover 才看得见」——tooltip 只是更快看到完整值，`aria-label` / `sr-only` 必须齐；
2. **`prefers-reduced-motion: reduce` 下全部降级**：不位移、不缩放、无 animation；
3. 不引第三方动画 / 图表库（`@keyframes` + SVG 手绘足够）；
4. 交互要能用键盘触达（可聚焦元素 + `@focus` 联动，如雷达图例 `tabindex="0"`）。

### 14.5 落地状态

| 组件                           | 状态                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `hero/ResumeHeroPro.vue`       | ✅ 已按新定位重做（六类手法）                                                                               |
| `experience` / `skills` 的 pro | ⏳ 目前是「静态排版」型（时间线 / 组头），**待按新定位补交互**：折叠成果列表、hover 联动、数字块 tooltip 等 |
| 未拆的 4 个区块                | ⏳ 落三档时直接按新定位写（别先做静态版再返工）                                                             |

## 15. hero 零件化 + hooks 化，以及 pro 的第二轮打磨（2026-10-08 追加）

> 关联：`Issue #24` 后续、`docs/dev/resume-styles.md` §12（组织方式）、§14（pro 定位）。
> 触发：Owner 实看第一版 pro 后反馈「不够区分、逻辑堆在一个文件里」，要求按 `experience/` 的做法抽组件与 hooks。

### 15.1 组织方式：档位只组装，零件在 `parts/`，数据在 composables

```text
components/resume/hero/
├── ResumeHeroCard.vue            薄壳（契约 + `.resume-card` 外壳 + variant 路由）
├── ResumeHeroMinimal.vue         极简：自给自足（不需要零件）
├── ResumeHeroStandard.vue        标准：组装 头像 / Info / 兴趣墙 + 自带 Intro 与 Links
├── ResumeHeroPro.vue             精致：**只组装**（数字块留在此文件，见下）
└── parts/
    ├── ResumeHeroAvatar.vue        头像翻牌 + 跟随光晕（**standard / pro 共用**）
    ├── ResumeHeroIntro.vue         Intro：打字机 + 折叠 + hover 聚焦
    ├── ResumeHeroInfo.vue          原 Contact：standard 条目卡 / pro 琴键胶囊
    ├── ResumeHeroLinks.vue         风铃挂卡（pro）
    ├── ResumeHeroInterestWall.vue  兴趣墙：standard 标签+tooltip / pro 折叠词云
    └── ResumeHeroSnapshots.vue     gallery 照片条（pro）

composables/
├── useHero.ts          hero 的数据视图与派生（原 `useResumeProfileView` 升级并改名）——
│                       三档与全部零件的**唯一数据入口**，零件自己 `useHero(props)`，
│                       不再由档位逐层透传 props
├── useHeroTyping.ts    打字机：断句 / 字符切分 / 节奏 / 循环重播
└── useHeroKeys.ts      琴键音效：C 大调音阶合成 + 首次点击解锁
```

**为什么 `数字块` 没拆**：它是"一个组件内的数据映射"（§12.1 手段 ②），
没有独立的数据与交互，拆出去只是把行数搬家。判据同 §12.3：**零件是否有自己的数据/交互/样式**。

> **能力雷达已从 hero 移出**（Owner 2026-10-08 判定）：它原来的用途是放在**专业技能**区，
> 以 tabs 切换「词云 / 图表」两种展示。数据字段（`profile.radar`）与 mock 保留，
> 但 hero 不再消费它（`useHero` 也不再返回），等 `skills` 区落地时再用。

**为什么头像能两档共用**：两档用的是同一份数据（`hero.frontImageUrl/backImageUrl`）与同一段 3D 翻牌，
差异只有"跟随光晕"与"徽标文案"——徽标用 `#badge` 插槽交给调用方（standard 是装饰、pro 是求职状态，语义不同）。

### 15.2 Intro 打字机（Owner 指定参数）

| 项   | 值                                                                      |
| ---- | ----------------------------------------------------------------------- |
| 节奏 | **135ms / 字**（`HERO_TYPING_SPEED`；Owner 逐轮校准 200 → 150 → 135）   |
| 停留 | 打完 **5s** 后从头重播（`HERO_TYPING_HOLD`）                            |
| 循环 | **无限循环**（Owner 明确要求，属"状态"语义）                            |
| 断句 | **只在「。！？」断**（分号不断）—— 分号会切掉"主张句"的后半段           |
| 字号 | 主张句 `0.95rem`（第一版 1.05rem 偏大）                                 |
| 降级 | `prefers-reduced-motion: reduce` → 静态显示全文，**不循环、不显示光标** |

实现要点（三条都有取舍）：

1. **逐字用 CSS stagger，不是 JS 改文本**：字符始终在 DOM 里 → SSR 一致、文本可选中、
   读屏可读（整句另有 `sr-only`，否则读屏把每个字当独立节点念）。速度与延迟都是变量，改配置不用改组件。
2. **循环靠自增 `cycle` + 组件上 `:key`** 让 Vue 重建节点、重播 CSS 动画；比手动 reflow 干净。
3. **`@media (prefers-reduced-motion: reduce)` 下 JS 也停**（`useHeroTyping` 里判 `matchMedia`），
   否则会"动画停了但定时器还在跑"。

> ⚠️ §14.3 第 3 条写着"不做为动而动的循环动画"。这里是有意的例外：打字机承担"正在输出"的状态含义，
> 且由 Owner 指定。**仅此一处**，不要据此扩展成"其他区块也加循环动效"。

### 15.3 Info（原 Contact）

- **改名 Contact → Info**：这一块实际装的是学历 / 年限 / 所在地 / 邮箱 / 电话，**学历也在其中**，
  名字与内容不符；改 Info 后信息浓度更高、也容得下更多条目（standard 与 pro 都改）。
- **琴键交互（pro）**：每个胶囊是一个键，点击 → 复制 + 按 **C 大调音阶**逐个键位发声
  （第 1 个键 C4 起，超出音阶自动升八度）；按下时有"键帽"感（下沉 1px、下缘厚度消失）+ ✓ + 涟漪。
- **音效不外引资源**：`useHeroKeys` 用 `OscillatorNode`（三角波）+ 短包络合成，体积为零。
  **首次点击才创建 `AudioContext`**（浏览器要求音频由用户手势解锁）；SSR / 不支持 Web Audio 时静默跳过，
  音效是附加值，不影响复制。
- **tooltip 只在真被截断时挂**：hover 时实测 `scrollWidth - clientWidth`，非截断条目 `:disabled`
  掉 tooltip（原先每条都挂，是冗余的重复信息）。
- **被截断的值 hover 时单程滚出**：位移由实测写入 `--info-shift`。
  ⚠️ 不能用纯 CSS 算：`translateX` 的百分比基准是**元素自身宽度**（被裁剪后的可见宽度），
  `calc(-100% + 可视宽)` 得不到「内容宽 − 可视宽」（实测差 23px，退化成不动）。

### 15.4 风铃（Links）与兴趣（2026-10-08 二次修订）

- **风铃挂在横杆上**：一根略粗、两端渐隐的横杆，每张卡有自己的**挂绳**；挂绳长短与卡片倾角按
  **固定序列**交错（⚠️ 不用随机 —— 随机会让 SSR 与客户端算出不同结果、破坏水合）→ 卡片高低错落。
  - **一排最多 8 个**（4~6 个是最佳观感），超出另起一根杆（`MAX_PER_ROW`）
  - 分布用 **`space-around`**（每张卡左右等距），再给每张一个**小的水平偏移**（`DRIFT_PATTERN`）
    打破"精确均分"的呆板感 —— 不用 `space-between`：两个时会被推到最左最右，显得空
- **兴趣：一个兴趣一个图标 + hover tooltip**（`ResumeHeroInterestWall`，standard / pro 共用形态）。
  上一版的「折叠 + 图 + 标签词云」被 Owner 判定过度设计而**推翻**；值得的递进只有"能不能点"：

  | 档         | 交互                                         |
  | ---------- | -------------------------------------------- |
  | `standard` | 纯展示（hover 动效后续再补，当前无任何事件） |
  | `pro`      | 多一个点击 → 全屏 gallery 浏览该兴趣的图集   |
  | `minimal`  | 不含这一区（保持默认观感不变）               |
  - 只有**配了图集**的兴趣才可点；没配就是普通标签（不给"点了没反应"的假入口）

- **内容模型增量**：`ResumeProfileInterest.description?` + `images?: ResumeInterestImage[]`
  （每张图 `{ url, href?, title? }`）。按 §7 落三处：`types/resume.ts`、`mock/resume-content.zh.ts`、
  `config/resume-editor-schemas.ts`。
  ⚠️ **`images` 本轮不在编辑表单里**：`ResumeSchemaForm` 只支持基础字段与「对象数组」两层，
  图集是"数组里的数组"，要可编辑得先扩表单能力；展示侧按"无图集就不开弹窗"容错。

### 15.5 `gallery` 归位

第一版把 `gallery` 当 pro 的**主视觉**（两图网格），于是"头像"与"照片"混在一个字段上，
`hero.frontImageUrl` 反而闲置。现在语义分开：**头像 = `hero`（翻牌）**、**照片 = `gallery`（结尾照片条）**，
编辑者填「头像」与填「照片」是两件事。

### 15.6 全屏 gallery：跨端共享组件的落点

兴趣图集要 **web（公开简历）与 admin（组件索引 / 示例）两边都能用** → 按 `layers.md` §7 的判据
（含模板、依赖 Nuxt UI → 进 `packages/ui`），它只能是共享 layer 组件：

| 落点     | 文件                                                 | 职责                                |
| -------- | ---------------------------------------------------- | ----------------------------------- |
| 组件     | `packages/ui/app/components/MyFullScreenGallery.vue` | 全屏浏览，`v-model:open` + `items`  |
| 组件索引 | `apps/admin/…/pages/comps/full-screen-modal.vue`     | 变体与边界（外链 / 纯展示 / 空态）  |
| 业务示例 | `apps/admin/…/pages/demos/hobby-modal.vue`           | 用兴趣数据复现"点击兴趣 → 开图集"   |
| 消费方   | `apps/web/…/hero/parts/ResumeHeroInterestWall.vue`   | pro 档点击打开（standard 是纯展示） |

- **基于 `UModal fullscreen`**：焦点陷阱、背景 inert、Esc 关闭、过渡动画都由 Nuxt UI 提供
  （早期版本用原生 `<dialog>` + `showModal()` 手写约 185 行 CSS，已由它取代 —— 自己重做最容易在焦点与滚动上留坑）。
- **深色衬底**（lightbox 惯例），**不跟随业务主题** —— 图片衬底不该随主题明暗变化；
  标题 / 说明 / 关闭按钮相应覆写成白色系。
- 样式全部写在标签上（Tailwind），组件内没有 style 块；字号用 `text-[…]` 精确值，避免自带行高。
- 命名沿用 `My` 前缀（DAO-017 定的），与 Nuxt UI 的 `U*` 区分；新增组件的完整步骤见 `packages/ui/README.md`。

### 15.7 验证要点

- 打字：字符数 × **135ms** ≈ 首→末间隔；打字窗口结束后光标停住；再等 `字数×135 + 5000` 后**重播**
  （检测末字回落 —— 首字重播后 1ms 就亮，轮询抓不到）。
- 琴键：点击后 `AudioContext` 才建；记录 `setValueAtTime` 的频率应依次递升（C4 261.63 → …）。
  ⚠️ 读 `oscillator.frequency.value` 拿不到真实频率（它反映"当前时间"的值，恒为默认 440）。
- 风铃：一行一根杆；分布为 `space-around`（两个时**不应贴到两端**，左右留白大致相等）；
  挂绳长度不等（`--hang` 不同）→ 卡片顶边不齐；水平偏移（`--drift`）不同 → 间距不被精确均分。
- 兴趣：standard 不可点（无 `button`、无弹窗）；pro 点击 → `<dialog>` 打开且 `items` 数量 = 该兴趣图集长度；
  Esc / 点背板可关闭；没图集的兴趣仍是纯标签。
- 回归：三档 SSR 均无 `Failed to resolve component` / `NUXT_E*`；`prefers-reduced-motion` 下
  打字/光晕/翻牌/风铃/涟漪全部静态。
