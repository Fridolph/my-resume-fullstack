# @template/admin — 后台公共基础模版

Nuxt 4 + @nuxt/ui 的后台应用骨架，作为后续 admin 项目的公共起点。含登录页、布局体系、Nuxt Layers 功能域分层，以及一个「组件库 demo」（Comps）体系，为后续开源组件与基础仓库做准备。

## 技术栈

- **Nuxt 4** + Vue 3.5 + **@nuxt/ui 4**（Tailwind CSS 4）
- **Nuxt Layers**（`apps/admin/layers/`）按功能域分层
- **编辑器**：Tiptap + highlight.js / lowlight（`TextEditor` 组件 demo 进行中）
- **PDF**：A4 纸张渲染 + 打印/导出（`PdfPage` / `PdfDocVnode` + `usePdf`）
- 工具：@vueuse/core、tw-animate-css、`utils/cn.ts`

## 目录结构

```
apps/admin/
├── app/                        # 主应用（跨域编排 + 公共资产）
│   ├── components/
│   │   ├── auth/               # AuthSplitLayout / LoginForm(→AuthLoginForm)
│   │   ├── admin/              # AdminSidebar / AdminHeader / AdminUserMenu
│   │   ├── modal/              # 组件库：ModalConfirm / ModalDeleteConfirm / ModalResponsive / ModalForbidden
│   │   ├── loaders/            # 组件库：LoadersColorSpin
│   │   ├── tour/               # 组件库：TourSpotlight / TourSpotlightStep（挖洞引导）
│   │   ├── permission/         # 组件库：PermissionWrapper（按权限显隐）
│   │   ├── pdf/                # 组件库：PdfPage / PdfCover / PdfDocument / PdfDocVnode（A4 渲染 + 页码）
│   │   └── TextEditor/         # Tiptap 编辑器（进行中：toolbars/nodes/marks/mention）
│   ├── config/
│   │   └── admin-navigation.ts # 主侧栏导航（含 Comps 组件库）
│   ├── layouts/                # kebab-case：has-sidebar / empty / demo / docs / pdf
│   ├── pages/
│   │   ├── index.vue           # dashboard（layout "has-sidebar"）
│   │   ├── login.vue           # 登录（layout: false）
│   │   ├── help.vue            # 帮助页（layout "docs"）
│   │   └── release-notes.vue   # 版本记录（layout "docs"）
│   ├── utils/cn.ts             # class 合并工具
│   ├── composables/            # useSpotlightTour / usePermission / usePdf
│   ├── types/admin.ts          # 布局/导航/登录相关类型
│   ├── types/editor.d.ts       # 编辑器领域类型（如 IMention）
│   └── app.vue                 # UApp + <NuxtLayout><NuxtPage /></NuxtLayout>
└── layers/                     # Nuxt Layers（自动发现，见 docs/dev/layers.md）
    ├── 11-resume/              # app/pages/resume/*（简历编辑域：草稿 / 布局 / 主题 / 版本）
    ├── 11-projects/            # 模板遗留 demo：app/pages/projects/*（去留待定）
    ├── 12-teams/               # 模板遗留 demo：app/pages/team/*（去留待定）
    ├── 13-settings/            # app/config/settings-navigation.ts + app/pages/settings*（二级侧栏）
    └── 20-comps/               # app/pages/comps/*（demo：modal / loaders / tour / permission-wrapper / pdf-review / …）
```

## 布局

| 布局 | 用法 | 场景 |
|---|---|---|
| `has-sidebar` | `definePageMeta({ layout: "has-sidebar", title: "..." })` | 后台管理页（可折叠侧栏 + Sticky Header + 可滚动内容） |
| `empty` | `definePageMeta({ layout: "empty" })` | 无边框，页面完全自控 |
| `demo` | `definePageMeta({ layout: "demo" })` | 组件/交互演示页 |
| `docs` | `definePageMeta({ layout: "docs" })` | 帮助/说明/版本记录（顶部返回条 + 锚点跳转） |
| `pdf` | `definePageMeta({ layout: "pdf" })` | PDF 预览/打印（A4 纸张 + 浮动「Back / Config / Print」） |

登录页用 `layout: false`（`AuthSplitLayout` 自带全屏容器）。

## 分层约定（Layers）

- 功能域页面放 `layers/<NN>-<name>/`，每个 layer 只需 `$meta.name`（自动发现）。
- 依赖方向：`layers/00-shared` ← feature layers（11~20）← `app/`；feature layer 只能依赖 `00-shared` + 自身。
- 公共/基础组件放 `app/components/`（全局自动导入），不急于下沉到 `00-shared`。
- 详见 [docs/dev/layers.md](../../docs/dev/layers.md)。

## 数据层（Pinia Colada）

数据层统一用 `@pinia/colada`，完整约定见 [docs/dev/data-layer.md](../../docs/dev/data-layer.md)：

- `plugins/httpRequest.ts` 注入 `$request`（ofetch）：baseURL、鉴权头、统一响应解包（对齐 `packages/common` 的 `{ success, data, message }`）与错误归一化。
- `app/apis/*` 只做取数；缓存与失效在 `app/composables/*` 的 query / mutation 里声明；query key 集中在 `app/lib/query-keys.ts`。
- 示例：`useHealthQuery()` + `/` 页面的 Infrastructure check 卡片（SSR 首屏取数 + 失效重取）。
- 模板遗留的 alova（上传）待迁移为原生 XHR + colada mutation，见 data-layer.md 第 5、6 节。

## 登录页

- 布局：`AuthSplitLayout`，`image-side="left" | "right"` 控制背景图在左/右。
- 表单：`AuthLoginForm`（组件 `LoginForm.vue`），提交 `emit("submit", { email, password })`，**未接后端**；接入时替换 `pages/login.vue` 的 `handleSubmit` 为 auth mutation 并 `navigateTo("/")`。

## Settings 二级导航

Settings 迁入 `layers/13-settings`：父页 `settings.vue`（`layout: "has-sidebar"`）内叠一层**二级左侧 sidebar**，右侧 `<NuxtPage />` 渲染子页。

```
/settings            → 重定向到 /settings/company
/settings/company    → company.vue
/settings/team       → team.vue
```

二级导航项在 `layers/13-settings/app/config/settings-navigation.ts` 声明；`type: "label"` 是分组标题。新增子页 = 加 `.vue` 文件 + 补一条导航。

## Comps 组件库（demo）

侧栏的 **Comps** 二级菜单是一个「组件库索引」，集中展示基础/公共组件与 demo，作为快速 AI 开发与标准化开发的参考：

- **组件**：`app/components/<category>/<Name>.vue`，自动命名 = `<Category><Name>`（如 `components/modal/Confirm.vue` → `ModalConfirm`）。
- **Demo 页**：`layers/20-comps/app/pages/comps/<name>.vue`（layout `has-sidebar` + `content-pad`）。
- **导航**：`admin-navigation.ts` 的 Comps 项下加 `children`。
- 路由用 `comps`（`/comps/*`），**不用 `components`**——`components` 是 Nuxt 保留目录，会导致 404。

已落地：`ModalConfirm` / `ModalDeleteConfirm`（删除确认 + 倒计时）、`ModalResponsive` / `ModalForbidden`、`LoadersColorSpin`（骨架屏后续 `LoadersSkeleton`）、`TourSpotlight` / `TourSpotlightStep`、`PermissionWrapper`（按权限显隐）、PDF（`PdfPage` / `PdfCover` / `PdfDocVnode`）。详见 [docs/dev/admin-ui-patterns.md](../../docs/dev/admin-ui-patterns.md) 第 7 节。

## PDF 预览 / 打印

`/demos/pdf-review` 是按 A4 纸张渲染现有组件的范本，可预览并导出 PDF：

- **组件**：`PdfPage`（A4 纸张，页眉/页脚、`landscape` 横版、自动页码）、`PdfCover`（封面原语）、`PdfCoverSheet`（**配置驱动**封面：开关 / 封面图 / 标题 / 对齐位置）、`PdfDocument` / `PdfDocVnode`（容器，收集页 + 自动页码；`PdfDocVnode` 在**渲染阶段**注入页码，SSR 即可用）。
- **配置**：`types/pdf.d.ts` 的 `PdfDocConfig`（`cover` / `header` / `fileName`）+ `usePdfConfig`（生效态 `config` / 编辑态 `draft`）。点工具栏 **Config** 打开抽屉，改完 Save 生效、Cancel 放弃；表单走 UForm + Zod——导出文件名必填（默认 `pdf-review_日期时间.pdf`）、开启封面时标题必填、其余可选。
- **composable**：`usePdf`（`providePdfDocument` / `usePdfPage` / `usePdfRenderState`）、`usePdfExport`（后端导出 + `print` 降级）。
- **后端导出（预留）**：`apis/pdf.ts` 的 `requestPdfExport`——前端把预览页 URL 交给后端，无头浏览器渲染后返回文件 URL 下载（接口约定见文件注释）。
- **布局**：`pdf`（无 admin 壳，浮动「Back / Config / Print」，打印时隐藏）。
- 导出：未接后端时用 `window.print()`；命名页（`@page portrait/landscape`）、`.pdf-page` 断页等打印样式在 `app/assets/css/main.css`（已内置）。

## 样式约定

- 移动优先；内容区最大宽度 1920px（`max-w-1920`）。
- 页面级留白统一 `content-pad`；单个 `class` 超 12 个类时抽 BEM + `@apply`。
- 详见 [docs/dev/css-conventions.md](../../docs/dev/css-conventions.md)。

## 接入真实登录

1. 在 `pages/login.vue` 的 `handleSubmit` 里调用登录接口。
2. 成功后写入会话状态并 `navigateTo("/")`。
3. 鉴权守卫参考 Nuxt 路由中间件 + `definePageMeta` 的 `auth` 元信息。

## 相关文档

- 本地开发规范与踩坑：[docs/dev/](../../docs/dev/README.md)（命名规则 / 布局组件模板 / 样式约定 / layers 分层）
- 上游架构经验沉淀：greensketch-website 的 `.vscode/graduate/`（请求层 / 数据层 / i18n / nuxt.config 分层等更完整的最佳实践）
