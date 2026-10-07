# Nuxt Layers 分层约定

`apps/admin` 用 Nuxt 4 **layers** 组织功能域（参考 greensketch 的 `layers/` 架构）。layers 放在 `apps/admin/layers/` 下，**自动发现**：每个 layer 需要一份 `nuxt.config.ts`，并用 `$meta.name` 命名。

## 1. 依赖方向（硬约束）

```
layers/00-shared  ←  feature layers（11~20）  ←  app/
```

- `app/` 可引用任意 layer（编排、跨域组合）。
- feature layer 只能依赖 `00-shared` + 自身。
- `00-shared` 不依赖任何 feature layer 或 `app/`。

## 2. 当前 layer 划分

| 目录 | name | 形态 | 内容 |
|---|---|---|---|
| `layers/11-resume` | `resume` | 完整 layer | `app/pages/resume/*`（简历编辑域：草稿 / 布局 / 主题 / 版本） |
| `layers/11-projects` | `projects` | 模板遗留 demo | `app/pages/projects/*`（项目域示例页，my-resume 暂未使用，去留待定） |
| `layers/12-teams` | `teams` | 模板遗留 demo | `app/pages/team/*`（团队域示例页，同上） |
| `layers/13-settings` | `settings` | 完整 layer | `app/config/settings-navigation.ts` + `app/pages/settings*`（二级侧栏 + 子页） |
| `layers/20-comps` | `comps` | 参考层 | `app/pages/comps/*`（组件库 demo 页，路由 `/comps/*`） |
| `layers/00-shared` | `base-config` | 共享层 | **待建**（见下） |

`app/` 保留：`app.vue`、`layouts/`、`config/admin-navigation.ts`（主侧栏导航，跨域编排）、`components/`（公共/基础组件）、`utils/`、`types/`、`pages/`（dashboard、login、help、release-notes）。

## 3. 公共组件 vs 共享层（关键约定）

- **公共/基础组件**（如 `AdminSidebar`、`ModalConfirm`、`AuthSplitLayout`）放 `app/components/`，layer 页面通过 Nuxt **全局自动导入**直接引用，**不**下沉到 shared。
- **只有**出现「组件互相组合 / 涉及 API 复合交互」的复杂组件时，才沉淀到 `layers/00-shared`（共享层）。在此之前 `00-shared` 不建、不塞基础组件。

> 理由：避免过早抽象。基础组件是「全应用可用」的公共资产，放 `app/components` 即可；真正需要跨层隔离、可独立测试的「复合/API 交互」组件才值得进 shared。

## 4. 新增 feature layer 的步骤

1. `mkdir layers/<NN>-<name>/app/pages/...`，写入页面。
2. 建 `layers/<NN>-<name>/nuxt.config.ts`：
   ```ts
   export default defineNuxtConfig({ $meta: { name: '<name>' } })
   ```
3. 在 `app/config/admin-navigation.ts` 的主导航里补对应 `children`/路由。
4. `pnpm --filter @template/admin typecheck` + dev server SSR 验证。

## 5. 验证清单

- 所有 layer 页面 HTTP 正常、无 `Failed to resolve component` / `NUXT_E*` 告警。
- layer 内相对 import（如 `../config/settings-navigation`）路径正确。
- 无跨层 import（feature layer 不 import 其它 feature layer 或 `app/`）。
