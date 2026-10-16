# layers/11-resume — 简历编辑域

简历的编辑、布局、主题与版本都在本 layer 内完成。

## 边界

- **属于本域**：简历草稿（draft）读写、内容编辑、版面布局、主题、版本对比、以及域内的组件 / composable / 类型。
- **不属于本域**：公开发布与快照（`12-publish`）、AI 相关能力（`14-ai`）、跨域共享的基础设施（`app/`）。
- **依赖方向**：本 layer 只依赖 `app/`（底座）与自身；不 import 其它 feature layer，也不被 `app/` 之外的 layer 反向依赖（详见 [docs/web/03*Layers*分层约定.md](../../../../docs/web/03_Layers_分层约定.md)）。

## 数据

- 数据请求走 `app/apis/*`（例如 `~/apis/resume`），缓存与失效走 colada，key 统一在 `~/lib/query-keys` 声明。
- 域内 composable 只做「组合 query / mutation」，不在组件里直接发请求。

## 现状

- 目前只有域入口页 `/resume`（骨架），用于验证 layer 发现、导航与数据层接入。
- 编辑器 / 布局 / 主题 / 版本等功能按里程碑各自建立任务卡后再落地。
- 文案暂用中文；是否引入 i18n 另行任务卡决定。
