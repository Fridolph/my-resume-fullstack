# DAO-047 双端 PDF 分页与下载

- 状态：done
- Owner：昇哥
- 日期：2026-10-19
- Issue：https://github.com/Fridolph/my-resume-fullstack/issues/58
- 分支：fys-dev/58-resume-pdf；worktree：/tmp/rs-pdf-design
- 设计：[导出与打印 §11](../../docs/dev/06_简历系统_导出与打印.md)

## 确认与边界

Owner 2026-10-19 确认“共享自动分页预览＋后端 Chromium 直接下载”。允许新增 Playwright/Chromium 与鉴权导出接口；不改数据库、环境变量、Docker 或发布配置。双端 UI 提交前需 Owner 实看。

主工作区未提交代码只按文件承接 PDF 渲染初稿；列表图标、其他导航及 lockfile 变动不带入。web 父路由缺 NuxtPage 导致 PDF 子页显示普通简历；移为同目录 index.vue 保持公开 URL 不变。

## 实施与验收

- 共享 HTML/CSS/分页函数由 @rs/ui/pdf 导出，前端隔离 iframe 与后端 Chromium setContent 消费同一入口。
- API `POST /api/resume/:id/pdf`：source + documentHash，成功二进制、错误 JSON。摘要覆盖 display；不接收 URL/HTML。
- 资源策略：纸面无外部网络加载；图片装饰不导出，内容链接保留。浏览器隔离上下文、全网阻断、并发上限 2、全流程超时及 finally 清理。
- 完整正文与模块显隐排序，能力组、嵌套富文本和过长段落不静默截断；A4 页码、总页数、缩放、失败重试、下载状态。
- `pnpm check` + 受影响 build；真实 Chromium 多页、超长、空、隐藏、未知富文本、内容摘要冲突、所有权、无令牌、响应头、PDF 文本与页数验证。
- Owner 桌面/移动观感验收待执行；不能把机器检查记作意图验收。

## 环境记录

新 worktree 冻结安装被 pnpm 12 的 packageManagerDependencies 元数据缺失阻止；直接运行已安装 pnpm.mjs 后以非冻结安装补全自身元数据，依赖版本不主动升级。随后按引导构建 common、generate Prisma。没有读取 .env。

## 交接

- 已完成：共享纸面 HTML/CSS/DOM 分页、双端工作台、web sibling 路由修复、鉴权 PDF 下载、二进制请求错误兼容、OpenAPI 与运行说明。
- 下一步：Owner 实看桌面/手机纸面留白、密度与分页，再按精确文件提交本轮并集成 dev；主工作区在制品不可整目录覆盖。
- 验证：见下方，机器通过；Owner 意图验尚未执行。
- 回滚：撤销本卡提交与新增依赖，不需数据库逆迁移。

## 执行与验证

| 检查 | 证据 |
| --- | --- |
| 完整质量门 | `pnpm check` 通过；common 27、utils 87、config 8、server 94，共 216 项测试；存量 resume.service.test.ts 一条 optional chaining lint warning，未顺手修改 |
| 构建 | common、utils、server、web、admin 构建成功；最终双端构建含 PDF 模板与工作台 |
| 下载 HTTP | `test:resume:pdf:http` 通过；真实 JWT Guard/Strategy、Controller、全局 JSON/StreamableFile 分流与 Chromium；仓储与身份恢复使用替身，无 DB 访问；400/401/404/409 和 published/draft 200、响应头 |
| 生成资源 | Renderer 并发上限、超时 context 清理、释放后可重试由独立用例验证；实际生成启用 Chromium sandbox |
| 分页 | `test:resume:pdf` 生成 7 页，正文逐字对照、无溢出/孤标题/空页、screen/print 完全一致、零网络请求；隐藏全部内容一页空态 |
| 文件检查 | pdfinfo 为 7 张 A4；PDFium 提取 45/45 文字标记与 12/12 富文本列表项；pdfplumber 检出 12 个链接；第 1/2 页 PNG 人工审看无裁切/重叠 |
| 双端 UI 自动化 | dev 与生产预览使用固定接口 fixture，登录、PDF sibling 路由、6 页预览、下载文件名、409 提示、390px 移动无横向溢出；无 pageerror。不是实际账号/库联调验收 |
| Owner 意图验 | 尚待 Owner 实看，不以机器检查替代 |

本机 pnpm 外壳自动切换报 ENOEXEC，使用忽略目录 `.local/bin/pnpm` 调用已安装 pnpm.mjs；未修改个人全局工具。锁文件只增加 pnpm12 自身元数据与 Playwright 两个包/服务端依赖；冻结安装通过，未带入初次解算产生的无关 peer snapshot 漂移。

## Review 判断与边界

- 符合已确认目标；不改 DB、环境变量、部署、发布或主工作区其他改动。共享引擎含纸面 CSS/DOM，所以使用 ui 子路径，后端消费不加载 Vue/Nuxt。
- 同一设备字体与 screen/print 验证一致；生产 Linux 中文字体和浏览器系统依赖尚未验收。跨设备精确换行不承诺一致。
- 图片装饰不导出；能力以文字与量尺导出；纸面统一单栏，不跟随网页的多栏/背景。发布仍是当前保存内容公开开关，不包含历史快照版本。
- 本轮已将 PDF 相关文件精确接入主工作区，4041/4047 已验证新入口；没有提交、合并或覆盖其他列表/导航在制品。4049 新接口未登录请求返回 401，未使用真实账号或写入数据库；成功下载与错误分支由隔离 HTTP 测试验证。
- 收口结论：**需补一项：Owner 桌面/移动意图验**。按项目 AGENTS §4，UI 修改保持工作区待验；当前无提交、无推送、无集成、不关闭 Issue，避免用未验 UI 带入 dev。
- 归母：本轮纸面实现留项目，暂不提出母仓规则变更。


## 2026-10-20 双端实际入口与浏览器打印修正

Owner 已认可生成的测试 PDF，要求修正实际 4041/4047 仍显示旧页面/应用布局的问题。

- 目标与文件：承接上述已确认实现到主工作区；web `[id].vue` 移至 `[id]/index.vue`，两端 PDF 页 `layout:false`，共享 `ResumePdfWorkspace.vue` 补宿主页打印样式。不改简历正文、数据库、环境变量或部署。
- 回滚：接入前逐文件备份于主仓 `.local/pdf-integration-backup`，含 manifest；保留列表、导航、个人简历入口等既有改动。尚未提交，勿整目录暂存。
- 屏幕：双端只有 PDF 操作栏与 A4 纸面，无公开站 Header/admin 侧栏；桌面与 390px 手机无横向溢出。
- 打印：按钮只打印隔离 iframe；浏览器菜单打印隐藏操作栏、提示与开发工具，重置屏幕缩放、外边距、背景和 iframe 高度，保持 A4。页面卸载恢复 body 标记。
- 真实入口机器验：4041/4047 用固定 fixture 登录和数据，均 6 页；75% 缩放时宿主页 PDF 仍 6 张 A4，PDFium 检出全部 45/45 标记，无工具栏/开发工具/空白页；按钮打印消息触发正确，下载/409/手机路径通过，零 pageerror。产物 `/tmp/rs-4041-host-print.pdf`、`/tmp/rs-4047-host-print.pdf` 及桌面/手机截图。
- 本轮主仓 typecheck、lint（1 条既有 warning）、216 tests、web/admin/server build、7 页分页回归和隔离 HTTP 回归通过。`pnpm check` 在 format 阶段被 5 个既有在制品阻挡（web main.css、ResumePublicHeader.vue、my-resumes/index.vue、旧 PdfCustomBlock.vue / PdfResumeDocument.vue）；未扩大格式化范围。本轮工作台格式检查通过。
- Owner 仍需实看实际页面与系统打印对话框；机器验不替代意图验，因此 UI 未提交/推送。纸面跨设备字体差异边界仍同上。

- 补充对照：同一 fixture 的两端宿主页打印与直接下载模板，逐页全文及分页一致；菜单打印 iframe 存在 Chromium 亚像素累计取整（第 6 页约 2.25pt），不宣称像素相同。页面“打印”按钮直接打印纸面文档，避免宿主 iframe 这层连续分页。独立 worktree 最新 `pnpm check` 全通过；主仓完整门仍受上述 5 个既有格式文件阻挡。

## Owner 确认

Owner 在后续任务确认当前预览后，授权提交、推送并集成 dev。该任务机器验、页面修正及文档已完成；新配置需求另开 Issue，不混入本卡。

- 实现提交：`8c130c4 feat(pdf): share paginated resume preview and Chromium download`，已随 #59 fast-forward 集成并推送 `origin/dev`。
- Issue #58 已回填关闭。上文“未提交/待验”为当时的阶段记录；最终提交依照 Owner 后续明确授权，实际字体与系统打印对话框的环境验收仍保留。
