# DAO-048 PDF 配置与公共预设

- 状态：done
- Issue：https://github.com/Fridolph/my-resume-fullstack/issues/59
- 分支：fys-dev/59-pdf-config
- 设计：[PDF配置](../../docs/dev/07_简历系统_PDF配置.md)
- 已确认：公共配置复用 + 每份独立配置、数据库持久化，新Issue完成后回填关闭、提交推送集成dev。
- 目标/非目标/契约/回滚/验收：以上设计文档为本任务详细设计；不修改历史发布与分享。
- 文件：common resume/pdf-config与文档契约；Prisma schema/migration；server resume配置service/controller及存量写入保留；ui PDF引擎/面板/composable；双端页面与apis；OpenAPI、README、测试。
- 风险：旧JSON兼容、配置互相覆盖、模块ID跨简历泄漏、页眉页脚挤占、双端与下载不一致。
- 下一步：历史迁移的注释校验和差异已只读定位；按Owner最新指示暂不应用PDF迁移，元数据修复及应用迁移待另行授权。仍需实看桌面/移动配置体验；本轮实现与隔离验证已收口。
- 验证：本轮实际执行结果见下方实施与收口记录。

## 实施与 Review

- 已完成：配置契约、可空列迁移、配置读取/保存、公共预设CAS、本人权限与所有权、正文/网页保存保留纸面、复制保留、模块删除清理引用、临时导出、双端共享面板、排版分页、OpenAPI及README。
- 方案取舍：用完整旧JSON作为Prisma条件更新保护读改写，未引入JSON路径SQL；并发变化409，避免旧快照覆盖。无依赖升级。
- 机器证据：`pnpm check`；web/admin/server build；`test:resume:pdf`、`test:resume:pdf:http`；`test:resume:pdf:config`；`test:resume:pdf:config:isolated`；浏览器双端桌面/手机与409输入保留。详细记录见设计文档。
- 现有库：未迁移（等待Owner环境选择）；临时实例已验证迁移与真实HTTP并销毁。运行新配置前需按现有服务的开发库应用可空列迁移并generate。
- Owner确认：本轮明确授权实现、提交推送、Issue回填关闭与合入dev。Owner观感与真实开发库联调未冒充已验。
- Review判断：范围成立，无计划外依赖/部署/发布；共享契约与API文档已同步。当前配置不做历史发布快照；打印字体环境边界保留。可在上述边界收口。
- 归母：实现经验留项目，不自动回灌。

## 收口

- 最新质量门通过：225项测试（common31/utils87/config8/server99），lint仅1条既有warning；web/admin/server构建通过。
- 本轮按Owner明确要求提交推送并fast-forward集成dev；迁移文件交付，现有库不动，应用命令见README。
- 实现提交：`37b7cd7 feat(pdf): persist per-resume settings and reusable personal preset`。
- 集成：`fys-dev/59-pdf-config` 已推送；主工作区 `dev` fast-forward 至 `37b7cd7` 并推送 `origin/dev`，未操作 `main`、tag 或发布。
- Issue #59 已回填验证证据、现有库未迁移及字体验收边界，并关闭。

## 2026-10-20 本机迁移后续

- Owner授权本机开发库迁移后，预检发现旧迁移 `20261015070500_role_fk_cascade` 校验和不同；Owner随后明确要求先排查、暂不应用PDF迁移。
- 只读核验：去掉文件开头8行说明注释后SHA-256精确匹配库内记录；三条目标外键的删除/更新级联与验证状态均符合预期。其余14条迁移校验和一致，无未完成迁移。
- 未执行任何数据库写入；PDF新列仍未应用。证据、范围限制及候选处理方式见设计文档的同日预检记录。本卡done指已交付实现与隔离验证，不代表本机环境迁移已完成。
