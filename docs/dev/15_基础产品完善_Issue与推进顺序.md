# 基础产品完善：Issue 与推进顺序

日期：2026-11-06。依据：[11-05 产品盘点](14_AI接入前_产品完成度盘点.md)、本日 GitHub 核对及 Owner“挨个建立 Issue 并按流程完善”的授权。源码基线仍为 `dev@9367c32`。本文只记录工作拆分、依赖和推进顺序；实时状态查 Issue，当前关键任务的执行证据查任务卡，不在这里复制状态表。

## 1. 本轮目标和边界

目标是先完成可靠的“作者维护简历 → 访客阅读/分享/PDF”产品，再进入 AI。已建 13 条独立任务，原 [#39](https://github.com/Fridolph/my-resume-fullstack/issues/39) 自定义模块与 [#46](https://github.com/Fridolph/my-resume-fullstack/issues/46) 上传继续复用，不重复建单。

本窗口承接逐项设计与后续确认过的实现；另一窗口继续已分配的真实功能验证和 skill 完善。本文不会向另一窗口自动派单，双方不在同一 worktree 修改文件。若验证窗口已认领某张 Issue，本窗口先核对其证据与文件范围再动手。

建单不表示全部方案已确认，也不表示所有功能都是 AI 的强制前置项。存在取舍的规则进入待确认设计；每次只展开一个可独立验收用例。公开注册、发布快照、多语言、回收站、复制简历和完整用户管理界面暂不自动扩入本轮，Owner 如需纳入，再形成独立需求。

## 2. Issue 映射与依赖

| 盘点项 / 场景 | Issue | 交付及进入实现的条件 |
| --- | --- | --- |
| R01 / F01 查询他人账号 | [#62 用户管理查询授权](https://github.com/Fridolph/my-resume-fullstack/issues/62) | 首项；确认 super_admin + view 的双重授权，保留所有角色 /me 自助读取；详见本轮设计 |
| R07 / F06 本人资料 | [#63 资料契约与失败恢复](https://github.com/Fridolph/my-resume-fullstack/issues/63) | 先复现无邮箱只改昵称；确认登录标识/清空规则，再改输入类型与保存，不从响应 nullable 推断输入 |
| R08 / F03 字段显示 | [#64 六项展示开关](https://github.com/Fridolph/my-resume-fullstack/issues/64) | 确认作者配置入口及“视觉隐藏”和“响应不提供数据”的区别，再做保存刷新/访客/PDF 闭环 |
| R02 / F04 默认唯一 | [#65 默认简历并发](https://github.com/Fridolph/my-resume-fullstack/issues/65) | 先隔离复现和选择锁/约束；数据库动作另确认，不能只靠事务名称宣称安全 |
| R03 / F04 首页归属 | [#66 首页作者选择](https://github.com/Fridolph/my-resume-fullstack/issues/66) | 确认个人站指定作者或多作者平台；不靠无依据排序选作者 |
| R04/R05 / F04 公开承诺 | [#67 发布与分享语义](https://github.com/Fridolph/my-resume-fullstack/issues/67) | 确认保存是否即时更新公开内容、链接限制作用范围；可能只需明确文档/提示，不能自动扩成快照开发 |
| R06 / F04 SEO | [#68 收录开关或明确延期](https://github.com/Fridolph/my-resume-fullstack/issues/68) | 依赖 #66/#67；若实施持久化字段先确认迁移，若延期记录决定和当前限制 |
| R09 / F02 工作入口 | [#69 Dashboard 真实化](https://github.com/Fridolph/my-resume-fullstack/issues/69) | 用现有简历数据/有效入口取代假数据，或明确 Demo；先确认最小页面方案，不扩统计后台 |
| R09 / 跨模块承诺 | [#70 帮助与有效入口](https://github.com/Fridolph/my-resume-fullstack/issues/70) | 帮助、注册/找回、AI 回退、Demo 导航分片处理；公开说明依赖 #67 |
| R08 / F03/F06 素材 | [#71 素材与外链闭环](https://github.com/Fridolph/my-resume-fullstack/issues/71) | 先确认需要的图片位置与外链行为；复用 #46 上传，不做导入/对象存储/清理系统 |
| API 交付 | [#72 OpenAPI 与模块契约](https://github.com/Fridolph/my-resume-fullstack/issues/72) | 按模块补齐 40 条路由及字段/权限/示例；各修复先同步自己的接口，不等此单一次补完 |
| V01/V02 回归入口 | [#73 HTTP 回归脚本](https://github.com/Fridolph/my-resume-fullstack/issues/73) | 对齐硬删除和当前 CRUD/冲突/隔离；执行前明确测试环境和数据清理；避免与验证窗口同时修改 |
| V01～V07 联合验收 | [#74 三端与运行交接](https://github.com/Fridolph/my-resume-fullstack/issues/74) | 汇总各单证据与 #39/#46 结果；未验证项明确保留，部署/CI/CD 改造另走设计授权 |

## 3. 建议推进顺序

1. **先做 #62**：授权规则确认 → 最小 Service/Controller 修复 → 单测和 API 文档同步 → 已确认测试环境验证。当前任务卡为 [DAO-053](../../dao/tasks/DAO-053-用户管理查询授权.md)，[设计交接](../server/10_用户管理查询授权_设计.md) 已起草。
2. **#63 → #64**：沿一条“本人更新资料”学习跨端输入，再补展示配置入口。#65～#68 的规则讨论可先进行，但每次实现只取一条任务。
3. **#65/#66/#67 → #68**：确定默认并发和首页/公开语义；SEO 实施与延期都要形成明确决定，不能将默认公开、分享和收录混为一件事。
4. **#69/#70/#71**：去掉用户会误解的占位承诺，补实际需要的素材入口；UI 仍需 Owner 桌面/移动端实看再提交。
5. **#72/#73 随功能持续补，#74 最终验收**：先完善回归入口，不等结束才发现脚本不能跑；每条任务保留“机器通过 / 真实链路通过 / Owner 意图验收 / 已发布”的区别。

这不是工期承诺。优先级随真实复现结果调整，旁支缺陷另建单；涉及数据库、环境、契约或发布的任务，在对应设计中说明影响与回退。个人展示站与多用户平台的验收范围不同，应由 Owner 决定。

## 4. 每条任务的完成方式

使用项目现有流程：讨论和最小设计 → Owner 确认关键规则 → 带 Issue 编号的 dev 短分支 → 每次实现一个场景 → 类型/单测/构建及按风险实测 → dao-review → 文档和证据回填 → 提交/推送 → 按集成规则合入 dev。main/tag/发布由 Owner 执行。

任务卡记录唯一执行状态；Issue 记录范围、验收和工程交付。涉及 UI 的变更需实看确认；未运行的测试不写成通过。功能实现进入 dev、证据与边界齐全后，按 dao/README 收口 Issue 和指针。本轮只完成 backlog 与首项候选设计，不关闭任何业务 Issue。

## 5. 首项确认门

#62 推荐：管理列表/详情仅允许 super_admin 且有 Settings.Users:view；/me 对所有已认证用户保留。现有 admin 权限预设包含 view，因此增加角色限制是产品权限收紧，必须明确确认。设计说明了兼容影响和验证矩阵；确认后从 DAO-053 的第一刀继续，不再重新盘点全项目。
