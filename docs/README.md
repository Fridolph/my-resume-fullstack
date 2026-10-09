# docs/dev — 开发规范与踩坑记录

> 沉淀 `apps/admin` 脚手架搭建过程中踩过的坑与形成的统一规范，供后续借鉴、参考与回归。

## 文档索引

| 文档                                                               | 内容                                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [nuxt-naming-and-pitfalls.md](./nuxt-naming-and-pitfalls.md)       | Nuxt 布局/组件命名规则、三个高频坑、统一验证流程                                                      |
| [admin-ui-patterns.md](./admin-ui-patterns.md)                     | admin 布局、导航、二级侧栏、用户下拉、占位页的统一模板                                                |
| [css-conventions.md](./css-conventions.md)                         | CSS/Tailwind 基础约定：响应式封顶 1920、间距、BEM、content-pad                                        |
| [layers.md](./layers.md)                                           | Nuxt Layers 分层约定：依赖方向、layer 划分、公共组件 vs 共享层、路径别名与 import 约定                |
| [data-layer.md](./data-layer.md)                                   | 数据层约定：`$request` 请求层、Pinia Colada 缓存层、query key 与失效策略                              |
| [workflow.md](./workflow.md)                                       | 开发流程：分支模型、Issue 驱动、提交规范、质量门与发布                                                |
| [resume-display-architecture.md](./resume-display-architecture.md) | 简历展示页架构：布局模式、主题/背景模型、组件拆分与编辑模式分期                                       |
| [resume-styles.md](./resume-styles.md)                             | 简历风格维度（`minimal` / `standard`）：token / variant / 整页模板三层落点、GS 模板切换机制参考与避坑 |
| [resume-edit-interactions.md](./resume-edit-interactions.md)       | 简历编辑交互约定：拖拽落点算法、未使用模块托盘、自动保存策略与避坑                                    |
| [identity-and-access.md](./identity-and-access.md)                 | 身份与权限：`permissionKeys` 契约、角色→权限预设、Header 三档、AI 试用配额的职责边界与分期            |

## 快速验证命令

```bash
# 类型检查（apps/admin）
pnpm --filter @template/admin typecheck

# 起一个临时 dev server 验证 SSR 渲染（避免与既有 4047 server 冲突）
cd apps/admin && pnpm exec nuxt dev --host 0.0.0.0 --port 4020

# 检查页面渲染与残留告警
curl -s http://localhost:4020/login | grep -o '<input[^>]*>'
curl -s http://localhost:4020/settings/company | grep -o -i 'Failed to resolve component\|NUXT_E[0-9]*'
```

## 一句话原则

1. **布局文件名 = kebab-case**，布局名即文件名的 kebab-case（`has-sidebar.vue` → `layout: "has-sidebar"`）。
2. **组件文件名 = PascalCase**，自动名 =「目录前缀 + 文件名」，文件名已带前缀则去重；拿不准就看 `.nuxt/types/components.d.ts`。
3. **`app.vue` 必须用 `<NuxtLayout>` 包 `<NuxtPage>`**，否则所有布局不生效。
4. 每改一次结构，跑一遍 `typecheck` + dev server SSR 检查，不要只看「没报错」。

## 上游参考

本仓库的实践源自 `greensketch-website` 的架构重构。更完整、更体系化的最佳实践（请求层封装、Pinia Colada 数据层、i18n 方案、nuxt.config 分层等）见该仓库的 `.vscode/graduate/` 目录（01~08 篇）。本目录只沉淀「admin 脚手架」这个切面落地时踩的坑与统一规范，两者互补。
