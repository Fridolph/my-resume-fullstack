# 简历展示页架构设计（布局 / 主题 / 背景 / 编辑预留）

> 状态：**历史设计稿 + 交付记录**。§1–§5、§8–§10 是阶段二开工时的设计稿；其中的待确认项（§3.3、§9）已于 2026-10-07 由 Owner 逐项定下，结果写在对应段落里，**以结果为准**。§6 起为交付后追加的实现记录。
> 关联：`DAO-007`、Issue #3 / #5 / #7 / #9 / #11、[resume-styles.md](./resume-styles.md)（风格维度，Issue #13）、[layers.md](./layers.md)、[data-layer.md](./data-layer.md)
> 现状：`pages/resume/index.vue` 只做编排；组件已按 §2 拆分并继续演进（`ResumeLoginButton` / `ResumeSettingsDrawer` / `editors/*`，见 §6.1）；布局、主题、背景均由配置驱动。

## 1. 要解决的问题

1. **页面不够"薄"**：进页面读不出结构 —— 顶栏、设置面板、渲染编排都在同一个文件里。
2. **布局单一**：只有「左 sticky + 右内容」一种，无法切通栏 / 三栏。
3. **主题维度混在一起**：现有 4 套预设里「深色科技」其实是 dark 模式 + 青色配色，明暗与配色被压成一个维度。
4. **没有背景层**：无法用纹理或图片做个性化背景。
5. **没有为拖拽排序 / 管理员配置预留契约**：现在改顺序只能改 mock 文件。

## 2. 目标结构：页面只做编排

```text
pages/resume/index.vue              只编排：Header + SettingsPanel + Container
components/resume/
├── ResumePageHeader.vue            顶栏：身份 + 操作入口（emit，不含面板本体）
├── ResumeSettingsPanel.vue         设置面板：布局 / 主题 / 背景 / 区块显隐
├── ResumePageContainer.vue         正文容器：注入主题变量 + 背景层 + 按 mode 生成网格
├── ResumeColumn.vue                单栏：渲染某个 slot 的有序区块
├── ResumeBackgroundLayer.vue       背景层（纯 CSS / 图片，位于卡片之下）
├── ResumeSectionCard.vue           区块外壳（已有，不变）
└── ResumeHeroCard.vue + *Section.vue   7 个区块（已有，props 契约不变）
composables/useResumeDisplay.ts     唯一配置状态 + 动作（SSR 安全）
```

`index.vue` 的目标形态（读起来就是结构）：

```vue
<template>
  <div>
    <ResumePageHeader :name="content.profile.name" @open-settings="..." />
    <ResumeSettingsPanel v-if="settingsOpen" />
    <ResumePageContainer :content="content" :config="config" />
  </div>
</template>
```

## 3. 契约设计（先定形状，再写代码）

### 3.1 布局

```ts
export type ResumeLayoutMode = 'single' | 'split' | 'threeColumn'
export type ResumeSlotKey = 'side' | 'main' | 'rail'
export type ResumeSplitSide = 'left' | 'right'

export interface ResumeLayoutConfig {
  mode: ResumeLayoutMode
  splitSide: ResumeSplitSide        // split 模式下固定栏在哪一侧
  stickySide: boolean
  sideWidth: 'compact' | 'wide'     // 280px / 360px
  gap: 'comfortable' | 'compact'
}
```

### 3.2 区块编排（拖拽排序的落点）

```ts
export interface ResumeSectionsConfig {
  order: ResumeSectionKey[]                                // 全局阅读顺序：拖拽排序改这里
  slot: Partial<Record<ResumeSectionKey, ResumeSlotKey>>   // 覆盖默认归属：跨栏拖拽改这里
  hidden: ResumeSectionKey[]
}
```

- 注册表里每个区块增加 `defaultSlot`；配置的 `slot` 覆盖它。
- 默认：`profile → side`、`evaluations → rail`、其余 `→ main`。

### 3.3 主题（设计稿原案，**未被采用**）

> **已确认结果（2026-10-07）**：保持**合并式预设** —— 一套预设自带明暗与配色（`resumeThemePresets` 里每项带 `dark` 标志），**不做** `mode × preset` 拆分。下面拆维度是当时的备选方案，保留以便追溯，不要照它实现。

```ts
export type ResumeColorMode = 'light' | 'dark'

export interface ResumeThemePreset {          // 只管配色
  id: string
  label: string
  primary: string
  gradientFrom: string
  gradientTo: string
}

export interface ResumeThemeConfig {          // 生效值 = mode + preset（允许微调）
  mode: ResumeColorMode
  presetId: string
  primary: string
  gradientFrom: string
  gradientTo: string
}
```

> 原案理由（**未采用**）：拆开后 `mode`（light / dark）× `preset`（简约白 / 绿色清新 / 蓝色商务 / 青色科技）= 8 种组合，UI 是两个独立按钮组，而不是 4 个混在一起的预设。

### 3.4 背景

```ts
export type ResumeBackgroundType = 'plain' | 'texture' | 'image'

export interface ResumeBackgroundConfig {
  type: ResumeBackgroundType
  textureId?: string        // plain / texture 使用
  image?: {
    url: string
    fit: 'cover' | 'contain'
    overlay: number         // 0~100，压暗/压亮遮罩强度，保证卡片可读
    blur: number            // 0~20px
  }
}
```

- **纹理预设**（纯 CSS / SVG，不新增依赖）：`none`（纯色）、`dots`（点阵）、`grid`（细网格）、`mesh`（渐变光斑）、`noise`（SVG data-URI 噪点）。
- **可读性**：背景层之上、卡片之下盖一层半透明 surface（`color-mix` + `backdrop-blur`），保证任何背景下正文清晰。
- **图片**：本轮只建模 + 允许填 URL；上传（选择文件 / 裁剪 / 存储）另立任务卡。

## 4. 三种布局的网格与响应式

| mode           | `lg` 及以上                                            | `lg` 以下            | slot 映射                            |
| -------------- | ------------------------------------------------------ | -------------------- | ------------------------------------ |
| `single`       | `grid-cols-1`                                          | 同                   | side / main / rail 全部并入单列      |
| `split`        | `[280px_minmax(0,1fr)]`（wide 360px），`splitSide` 决定固定栏在左/右 | 单列，固定栏在前     | rail 并入 main                       |
| `threeColumn`  | `[1fr_4fr_1fr]`（= 1/6 : 2/3 : 1/6）                   | 单列                 | side→左栏、main→中栏、rail→右栏       |

- 移动端一律单列，顺序按 `order`；`profile` 的 `defaultOrder` 最小，天然排在最前。
- 三种模式共用同一份 `order` 与 `slot`，切模式不丢配置。

## 5. 状态层：`useResumeDisplay`

- 用 **`useState('resume-display-config', () => structuredClone(resumeDisplayMock))`** 持有唯一配置。
  （不要用 module 级 `reactive`：SSR 下会跨请求串状态。）
- 暴露动作而非裸对象：`setLayoutMode` / `setSplitSide` / `toggleStickySide` / `setSideWidth` / `setColorMode` / `applyThemePreset` / `setBackground` / `setTexture` / `setImage` / `toggleSection` / `moveSection` / `assignSlot` / `reset` / `saveLocal`。
- `isDirty`：与初始快照对比，决定「保存 / 重置」是否出现。
- `saveLocal()`：先写 `localStorage`（你说的 pinia 缓存方向），后续换成后端提交。
- 页面与设置面板**只调用动作**，不直接改配置对象。

## 6. 编辑模式：本轮只预留，不实现

你设想的是「管理员登录后直接在页面里配：模块可拖拽、确认后保存入库」。建议分三期：

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| A | 只读渲染 + 设置面板；契约预留 `editable` | ✅ 已交付（PR #6） |
| B | 管理员登录 → 编辑模式：跨栏拖拽排序、显隐、主题 / 背景、保存到本地 | ✅ 已交付（PR #8，登录为**本地 mock**） |
| C | 保存接后端（`PUT /resume/display-config`），公开快照携带该配置 | 待做 |

### B 期实现要点（2026-10-07）

- **登录是 mock**：`composables/useResumeAdmin.ts` 在**前端**校验 `admin / admin`，只用于把交互链路跑通。
  ⚠️ 它不提供任何安全保护（账号写在前端，任何人可绕过）；接后端 auth 时替换 `signIn` 与 `isAdmin` 即可。
- **SSR 不渲染编辑态**：登录态与本地配置都在 `onMounted` 恢复，`editable` 初始为 `false`，避免水合不一致。
- **拖拽只在客户端、只在编辑态**：`ResumePageContainer` 里动态 `import('sortablejs')`，
  用 `data-slot` 定位栏容器，`handle: '[data-drag-handle]'`；栏为空时元素不存在，自然跳过。
- **落点用锚点语义**：拖拽结束后取 `item.nextElementSibling` 的 `data-section-key` 作为锚点，
  `applyDragResult({ key, toSlot, anchorKey })` 把 key 插到锚点之前 —— 同栏排序与跨栏拖拽是同一套逻辑。
- **编辑能力仍由容器注入**：手柄与隐藏按钮在 `ResumeColumn` 这一层渲染，区块组件照旧只读。
- **保存**：`localStorage`（`my-resume.display-config`），C 期换成后端接口。

**让组件可复用的关键约束**（这条决定组件会不会写脏）：

- 区块组件**永不感知编辑态**：`ResumeSectionCard` 与 7 个区块保持只读契约，props 不变。
- 编辑能力由**外层容器注入**：编辑模式下，容器给每个区块包一层「拖拽手柄 + 选中态」，通过 `editable` prop / 插槽向下传，而不是让区块自己判断。
- 于是同一份区块组件同时服务 web 展示与 admin 编辑；admin 现有的 `useResumeLayout` 将来收敛到这套契约。
- 拖拽实现优先复用已有依赖 `sortablejs`（admin 在用，经 `@vueuse/integrations`），不新增拖拽库。

### 内容编辑（2026-10-07 追加）

布局能调、内容改不了是缺口，所以补上「点区块 → 编辑字段 → 实时预览 → 保存」：

- **状态分离**：`useResumeContent` 管领域内容，`useResumeDisplay` 管呈现方式，两者各自持久化（`my-resume.resume-content` / `my-resume.display-config`）。
  内容字段太多，逐个写 `setXxx` 不现实 —— 表单**就地改字段** + `touch()` 标脏；展示配置仍只走动作（它改的是结构，值得约束）。
- **schema 驱动**：`config/resume-editor-schemas.ts` 声明每个区块要编辑哪些字段（`fields` 直改根对象路径、`list` 编辑数组），
  于是 **新增区块只有三处**：展示组件、展示注册表、编辑 schema。
- **两类字段**：`fields`（`profile.name` 这类路径，支持根级如 `evaluations`）与 `list`（`experience` 这类对象数组，支持增删 / 上下移动）。
  字段类型先覆盖 `text` / `textarea` / `tags`（标签数组，回车添加、点标签删除）。
- **编辑入口仍由容器注入**：`ResumeColumn` 在 `editable` 时多渲染一个铅笔按钮并 emit `edit`，
  区块组件依旧不感知编辑态；抽屉 `ResumeSectionEditorDrawer` 只负责「取 schema → 交给通用表单 → 标脏 / 保存」。

## 6.1 页面外壳（chrome）：头部瘦身与入口栏

头部「重」的根因不是 `ResumePageHeader`（它只有 37 行），而是**编排层**把登录、保存、设置开关、两个弹窗都堆在页面里。

### 第 1 期（已交付，PR #12）

- `ResumeLoginButton`：登录按钮与弹窗合并；`variant: text | icon` —— 第 2 期可直接放进入口栏。
- `ResumeSettingsDrawer`：设置改由 `UDrawer` 承载，`ResumeSettingsPanel` 退化为**纯内容组件**（无宽度样式、无页脚动作）。
  好处：头部高度不再随设置开合变化。
- `ResumeDisplayConfig.brand`：`logoText` / `logoUrl` / `title` / `description`，**未配置回退预设**（姓名首字 / 姓名 / 定位）。
  解析在页面完成（`brand` computed），`ResumePageHeader` 只排版。
- `useResumeActiveSection`：`IntersectionObserver` 观察正文栏的 `[data-section-key]`，
  `rootMargin: '-72px 0px -55% 0px'` 取「当前正在读」的区块；头部中区显示其标题，回到顶部恢复品牌区。
  只观察 main 栏，符合「主内容模块才参与」的预期。

### 第 2 期（已确认方向，待实施）

把操作入口从头部迁进**收起式左侧窄栏（rail）**：

- **形态**：自定义 `aside`（固定宽 56px）+ `UTooltip` + `UButton`，不使用 `UDashboardSidebar` ——
  后者属于后台仪表盘体系，会给公开站引入整页布局语义。
- **可见性**：按登录态分级 —— 未登录只显示访客也用得上的项（主题 / 语言 / 登录）；
  登录后再出现设置、编辑、AI 等。
- **契约**：`ResumeChromeAction { key, label, icon, group: 'main' | 'footer', visible?, onSelect }`；
  暂不与 admin 共享组件（形态与语义不同），但形状保持一致，将来若三处复用再抽到 `packages`。
- **响应式**：< `lg` 隐藏 rail，改为头部一个「菜单」图标 → 打开 Drawer 呈现**同一份 items**（只有一份配置）。
- **注意**：正文容器需要 `lg:pl-14` 偏移；rail 默认半透明 + hover 提亮，避免访客误以为进了后台。

## 7. 与 admin 的关系（本轮不动 admin）

- `ResumeDisplayConfig` 是共享形状；本轮 web 侧扩展（`layout` / `sections` / `theme.mode` / `background`）后，会与 admin 的 `useResumeLayout` **暂时分叉**。
- 打通（admin 生成配置 → web 渲染）放到后续任务，届时以 web 侧契约为准收敛，并做一次显式字段迁移。
- 分叉期的风险要写进任务卡，避免以后"以为两边还是同一份"。

## 8. 编码顺序（阶段二已按此执行完毕）

1. 类型与 mock 升级（`layout` / `sections` / `theme` / `background`）→ `typecheck` 过
2. `composables/useResumeDisplay.ts` 状态层，页面与面板改调动作
3. 拆组件：`ResumePageHeader` / `ResumeSettingsPanel` / `ResumePageContainer` / `ResumeColumn` / `ResumeBackgroundLayer`；删除 `ResumeDisplayRenderer.vue`
4. 三种布局 + 响应式（含 375px 与桌面）
5. 主题（mode × preset）+ 背景（plain / texture，image 只建模）
6. 验证：`typecheck`、SSR 抓 `/resume`、配置切换实测、移动端目测

## 9. 待 Owner 确认（2026-10-07 已全部确认，结果如下）

1. **编辑能力归属** → **web 端原地编辑**（登录后；按 A / B / C 分期，A、B 已交付，C 期接后端）。
2. **主题模型** → **保持合并式预设**，不做 `mode × preset`（见 §3.3）。
3. **背景范围** → **纯 CSS / SVG 纹理 + 图片仅建模**，本轮不做上传。
4. **三栏比例** → 按 `1fr 4fr 1fr`（= 1/6 : 2/3 : 1/6）。
5. **契约先扩展** → 接受 web 侧先扩展、admin 暂不跟进（分叉期风险见 §7；`brand`、`style` 均属这批扩展）。

## 10. 阶段二明确不做（后续各节按需解锁）

拖拽实现、登录 / 鉴权、后端入库、图片上传、PDF 导出、i18n、技能可视化图表。
