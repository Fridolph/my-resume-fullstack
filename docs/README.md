# docs — 项目文档

> 本仓的开发规范与踩坑记录，供后续借鉴、参考与回归。
>
> ## 目录结构
>
> | 目录 | 放什么 |
> | ---- | ------ |
> | `web/` | `apps/web` 的约定与设计 |
> | `admin/` | `apps/admin` 的约定与设计 |
> | `server/` | `apps/api` 的约定与设计 |
> | `dev/` | **开发相关**：流程，以及跨端 / 公共的架构设计 |
>
> 后续还会有 `changelog/`、`复盘/`、架构等目录 —— 按"谁关心它"分，而不是按文件类型分。
>
> **文件命名**：`<目录>/<两位序号>_<模块>_<说明>.md`，如 `web/01_Nuxt_命名与踩坑.md`。
> 序号表达**阅读顺序**（从基础设施到具体业务），不是为了排序而排序。
> 中文名是为了"在编辑器侧栏一眼知道这篇讲什么"，代价是命令行补全稍麻烦 —— 这里选了可读性。

## 文档索引

| 文档 | 内容 |
| ---- | ---- |
| **web（`apps/web`）** | |
| [01_Nuxt_命名与踩坑.md](web/01_Nuxt_命名与踩坑.md) | Nuxt 布局/组件命名规则、三个高频坑、统一验证流程 |
| [02_CSS_基础约定.md](web/02_CSS_基础约定.md) | CSS/Tailwind 基础约定：响应式封顶 1920、间距、BEM、content-pad |
| [03_Layers_分层约定.md](web/03_Layers_分层约定.md) | Nuxt Layers 分层约定：依赖方向、layer 划分、公共组件 vs 共享层、路径别名 |
| [04_数据层_约定.md](web/04_数据层_约定.md) | 数据层：`$request` 请求层、Pinia Colada 缓存层、query key 与失效策略 |
| [05_请求错误处理_设计.md](web/05_请求错误处理_设计.md) | 请求错误处理：错误归一化、`api:error` hook、重试与登出策略 |
| [06_简历展示_架构设计.md](web/06_简历展示_架构设计.md) | 简历展示页架构：布局模式、主题/背景模型、组件拆分与编辑模式分期 |
| [07_简历风格_三档实现.md](web/07_简历风格_三档实现.md) | 简历风格维度（`minimal` / `standard` / `pro`）：token / variant / 整页模板三层落点与避坑 |
| [08_简历编辑_交互约定.md](web/08_简历编辑_交互约定.md) | 简历编辑交互：拖拽落点算法、未使用模块托盘、自动保存策略与避坑 |
| **admin（`apps/admin`）** | |
| [01_UI_布局与组件模式.md](admin/01_UI_布局与组件模式.md) | admin 布局、导航、二级侧栏、用户下拉、占位页的统一模板 |
| **server（`apps/api`）** | |
| [01_API_约定.md](server/01_API_约定.md) | 后端约定：唯一响应契约（`code` + `errorCode` 双层）、鉴权、目录与分层判据、Prisma 7 行为变化 |
| **repo（仓库级 / 跨端）** | |
| [01_开发流程_分支与提交.md](dev/01_开发流程_分支与提交.md) | 开发流程：分支模型、Issue 驱动、提交规范、质量门与发布 |
| [02_身份与权限_设计.md](dev/02_身份与权限_设计.md) | 身份与权限：`permissionKeys` 契约、角色→权限预设、Header 三档、AI 试用配额的分期与职责边界 |

## 提交前的最小自检

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
```

（admin 页面特有的 SSR 渲染检查见 `admin/01_UI_布局与组件模式.md`；后端接口的实测清单见 `server/01_API_约定.md` §5。）

## 一句话原则

1. **布局文件名 = kebab-case**，布局名即文件名的 kebab-case（`has-sidebar.vue` → `layout: "has-sidebar"`）。
2. **组件文件名 = PascalCase**，自动名 =「目录前缀 + 文件名」，文件名已带前缀则去重；拿不准就看 `.nuxt/types/components.d.ts`。
3. **`app.vue` 必须用 `<NuxtLayout>` 包 `<NuxtPage>`**，否则所有布局不生效。
4. 每改一次结构，跑一遍 `typecheck` + dev server SSR 检查，不要只看「没报错」。

## 上游参考

本仓库的实践源自 `greensketch-website` 的架构重构。更完整、更体系化的最佳实践（请求层封装、Pinia Colada 数据层、i18n 方案、nuxt.config 分层等）见该仓库的 `.vscode/graduate/` 目录（01~08 篇）。本目录只沉淀「admin 脚手架」这个切面落地时踩的坑与统一规范，两者互补。
