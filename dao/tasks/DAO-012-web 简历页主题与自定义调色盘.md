# 【DAO-012】web 简历页主题：三栏 300px、预设精简 + 自定义调色盘

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`self-tested`
- Owner：`昇哥定范围（三栏 300px、「蓝色简约」沿用 #1578d0、自定义开放到底色/文字/边框等）`
- 创建日期：`2026-10-08`
- 关联：`Issue #18`、`DAO-010`（样式统一，引入了 `content-max` 与域公共类）、`DAO-011`（编辑交互，改了同一批组件）、`docs/dev/resume-styles.md` §11、`docs/dev/resume-display-architecture.md`

## 状态轨迹

| 迁移                      | 依据                                                                                     | 确认者     | 日期       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`     | 定下三件事与范围：三栏左右固定 300px；主题预设删「蓝色商务」、「蓝色简约」沿用 `#1578d0`；新增「自定义」并开放底色/文字/边框等可编辑 | Owner 确认 | 2026-10-08 |
| `designed -> in-progress` | Issue #18 建立（#17 已被文档 PR 占用），分支 `feat/18-resume-theme-custom` 从 dev 开出 | 归枢记录 | 2026-10-08 |
| `in-progress -> self-tested` | 数据层 + 面板 + 三栏全部落地；typecheck / oxlint / SSR（三栏栅格、调色盘 9 项、无「蓝色商务」）通过 | 归枢记录 | 2026-10-08 |
| `self-tested -> in-progress`（模型升级） | Owner 追加要求：明暗做成独立维度、每套预设自带 light/dark 两组色值（**推翻 `DAO-007` 的合并式决定**） | Owner 确认 | 2026-10-08 |
| 升级完成 `-> self-tested` | 预设 × 明暗双向落地；typecheck / oxlint / SSR（深色组生效、两组平铺）通过 | 归枢记录 | 2026-10-08 |

## Grill：开工前对齐

- 目标：① 三栏左右两栏固定 `300px`；② 主题预设精简为 3 个并删除「蓝色商务」；③ 主题颜色字段显式化，支持「自定义」逐项编辑（含底色 / 文字 / 边框 / 标签）；④ 主题按钮组下方新增调色盘：预设态只读、自定义态可编辑，可切明暗。
- 边界：只改 `apps/web/layers/11-public-resume/app/**` 与 `docs/dev/resume-styles.md`；不改 admin、不接后端、不新增依赖。
- 不做：字体 / 间距 / 圆角（继续共用一套）；不引入 ui.nuxt.com/theme 的编辑器（docs 站实现，非 npm 组件）。
- 涉及文件 / 模块：`types/resume.ts`、`mock/resume-display.ts`、`composables/useResumeDisplay.ts`、`pages/resume/index.vue`、`components/resume/{ResumePageContainer,ResumeSettingsPanel}.vue`。
- 风险与未知：① 颜色从「dark 派生」改为显式字段，会让**旧 localStorage 配置缺字段** → 必须迁移（已做 `normalizeTheme`）；② `UDrawer` 在 SSR 不渲染内容，面板验证要临时直出；③ `UColorPicker` 的 `defineModel({ type: String })` 使 `update:modelValue` 为 `string | undefined`，需要 `?? ''`；④ 自定义色的对比度由用户负责（未做自动校验）。
- 验收：见 `Issue #18`（三栏 300px / 3 预设 + 自定义且无「蓝色商务」/ 预设只读可见色值、自定义可编辑且即时生效 / 旧配置可迁移 / typecheck + oxlint + SSR）。
- 第一刀：先显式化主题字段（类型 + 预设 + 迁移），再改注入与面板。
- 过门判断：`可开工`。

## 设计与决策

| 决策                                                     | 理由 / 证据                                                                             | 确认者   | 日期       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ---------- |
| 三栏左右固定 `300px`（比例 → 固定）                       | `1fr 4fr 1fr` 在 1920 容器下左右仅约 320px 且随屏变化，信息栏读起来挤；固定更可预期     | Owner 确认 | 2026-10-08 |
| 颜色字段显式化（surface/text/muted/border/chip* 进类型）  | 「自定义」要求逐项编辑，而它们原来是 `dark` 三元派生出来的，无法单独改                  | 归枢起草 | 2026-10-08 |
| 预设颜色统一为 hex                                        | `UColorPicker` 默认 `format="hex"`，hex 便于编辑与回显（原 `rgb(r g b)` 需转换）        | 归枢起草 | 2026-10-08 |
| 「自定义」= 复制当前配色 + 换 id                          | 从任意预设出发都能接着微调，不必从空白开始；切回预设时不保留自定义值（符合"看预设"预期） | 归枢起草 | 2026-10-08 |
| 调色盘用 `UColorPicker` + `UPopover`                      | Nuxt UI 自带的 inline picker，popover 收纳避免面板过长；官网编辑器不是可复用组件        | 归枢起草 | 2026-10-08 |
| `dark` 保留为「明暗语义」                                 | 页面底色渐变与背景遮罩仍需要它；颜色已显式化，不冲突                                    | 归枢起草 | 2026-10-08 |
| 旧配置迁移（同 id 补全 / 未知 id 回退首个预设）            | 否则旧 localStorage 会让新变量为 `undefined`，页面直接失色                              | 归枢起草 | 2026-10-08 |
| 字体 / 间距 / 圆角不动                                    | Owner 明确「暂不改变」；也避免与 `DAO-010` 的风格 token 体系纠缠                        | Owner 确认 | 2026-10-08 |
| **主题改为「配色预设 × 明暗」**（推翻合并式）              | 「深色科技」把明暗与配色压成一维，无法表达「蓝色 + 深色」；改为每套预设自带 light/dark 两组 + 独立 `mode` | Owner 确认 | 2026-10-08 |
| 第三套预设改名「科技感」：浅色=冷调浅底，深色=纯黑底 + 青色 | Owner 指定「深色 + 黑色为主」（指深色组），浅色组按冷调给一版 | Owner 确认 | 2026-10-08 |
| 调色盘**两组平铺**（18 项）                               | Owner 选定：两组随时能对照，不必来回切模式                                                | Owner 确认 | 2026-10-08 |
| 切预设**保留当前明暗**                                    | 「绿色 + 深色」本身是合理组合，不该被重置为浅色                                          | 归枢起草 | 2026-10-08 |
| 旧配置迁移：认得出 id 用预设补底，平铺的旧值落到 `mode` 那组 | 主题模型改过三轮（派生 → 平铺 → 两组），不迁移会让新变量变 `undefined`                    | 归枢起草 | 2026-10-08 |

## 执行与验证

| 类型   | 命令 / 样本 / 链接 | 结果 | 仍未验证的边界 |
| ------ | ------------------ | ---- | -------------- |
| 机器验 | `pnpm --filter @template/web typecheck`；`oxlint apps/web` | 通过；oxlint 0 warning / 0 error（43 files） | 全仓 `format:check` 仍是既有缺口（DAO-006） |
| 结构验 | 主题字段显式化：`ResumeThemeConfig` 增 `surface/text/muted/border/chipBg/chipText`；预设写全并统一 hex；`resumeThemeFields` 供面板驱动 | 通过；页面注入改为直接取字段，不再按 `dark` 派生 | 未做自动对比度校验（自定义浅色文字压在浅底上可能不可读） |
| 结构验 | 三栏栅格：`1fr 4fr 1fr` → `[300px_minmax(0,1fr)_300px]`（单侧退化为 300px + 1fr） | 通过；SSR 抓到 `lg:grid-cols-[300px_minmax(0,1fr)_300px]` | split / single 未改，未回归复测（改动只在 threeColumn 分支） |
| 意图验 | 临时 threeColumn + 面板直出后抓 `/resume` | 通过；9 项字段标签（主色/渐变起/渐变止/纸面/正文/次要文字/边框/标签底/标签字）全部渲染、只读 hex 值可见、**不含「蓝色商务」**、无 `Failed to resolve component` / `NUXT_E*` | 自定义态的编辑交互（拖色、hex 输入）未在浏览器实操 |
| 意图验 | 面板直出 + 预设态抓页 | 通过；主题按钮为「蓝色简约 / 绿色清新 / 深色科技 / 自定义」 | 「自定义」态下的 `UColorPicker` 交互需人工点验 |
| 机器验 | 迁移路径：`normalizeTheme` 补全缺字段 / 未知 id 回退 | 代码路径已实现并 typecheck 通过 | 未用真实旧 localStorage 数据端到端跑一次（需浏览器） |
| 意图验 | 临时 `tech + dark` 抓 `/resume` | 通过；`--resume-primary:#22d3ee`、`--resume-surface:#000000`（**纯黑底**）、`--resume-text:#e5e7eb`、底色渐变切到深色那套 | 科技感「浅色组」观感未目视 |
| 意图验 | 面板直出抓页（`tech + dark`） | 通过；9 个字段标签各出现 **2 次**（浅色 / 深色两组平铺）、明暗按钮与 3 预设 + 自定义齐全、无 `Failed to resolve component` / `NUXT_E*` | 自定义态 18 行的编辑交互（拖色 / hex 输入）未在浏览器实操 |

## 交接

- 已完成：三栏固定 300px；主题预设精简与改名（蓝色简约 / 绿色清新 / **科技感**）；**主题模型升级为「配色预设 × 明暗」**（每套预设自带 light/dark 两组，`mode` 独立切换）；`setMode` / `setThemeField(mode, key, value)` / `applyCustomTheme` / 三轮 `normalizeTheme` 迁移；页面注入按 `mode` 取组；面板明暗切换 + **两组平铺调色盘**（预设只读 / 自定义可编辑）；文档：`resume-styles.md` §10 改写并**修订** `resume-display-architecture.md` §3.3（「未采用」→「已采用」）。
- 当前状态：`self-tested`（编码与机器验证完成）
- 阻塞：无。
- 下一步第一刀：提交并 push 到 `feat/18-resume-theme-custom`（PR #19 已加说明）；人工目视可在浏览器验证「切明暗 → 两组色值分别生效」「预设只读 → 切自定义 → 改色即时生效」。
- 文档锚点：`Issue #18`、`docs/dev/resume-styles.md` §11
- 集成锚点：`待 feat/18-* -> dev`

## 收口与沉淀

- `dao-review` 结论：`未执行`
- 最终验证证据：`见上表`
- Git / PR：`待补`
- 常规提交：`待补`
- Dao Commit：`不适用`
- 沉淀候选：`候选观察` —— 「主题可自定义」的正解是把颜色**从派生改为显式字段 + 迁移旧数据**，而不是在渲染层加 `?? fallback`；另外「框架官网的 theme 编辑器通常是 docs 实现，不是可复用组件」这条在 React 版（shadcn）同样可能遇到，值得对照。
- 收口备注：① 与 `DAO-011`（编辑交互）改了同一批组件，合并顺序需注意 `ResumeSettingsPanel` / `useResumeDisplay` 冲突；② **决策反转已同步文档**（`architecture` §3.3 改为「已采用」，`resume-styles` §10.2 记反转原因），避免两处说法打架；③ 主题模型现在改过三轮，`normalizeTheme` 是后续任何结构再变时的必改点。
