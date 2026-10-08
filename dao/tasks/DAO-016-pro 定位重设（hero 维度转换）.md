# 【DAO-016】pro 定位重设：hero 从「静态排版」改为「展示形式的维度转换」

> 任务卡是这一关键事件的唯一事实源。只写改变下一步判断的事实；不要复制聊天记录或原始终端输出。

## 身份

- 状态：`done`
- Owner：`昇哥实看后重设 pro 定位（在 standard 之上叠交互；同一信息换维度；不堆特效）`
- 创建日期：`2026-10-08`
- 关联：`Issue #24`、`DAO-014`（hero 初版：画廊 / 数字块 / 雷达）、`DAO-015`（风格实现架构 §12）、`docs/dev/resume-styles.md` §11.1 与 §14

## 状态轨迹

| 迁移                      | 依据                                                                                     | 确认者     | 日期       |
| ------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ---------- |
| `planned -> designed`     | Owner 实看 pro 后判定「精致感没出来」，重设定位：**在 standard 之上叠交互**、**同一信息换维度**、**不是堆特效**（tooltip / 折叠 / 压缩 / 3D / 图表） | Owner 确认 | 2026-10-08 |
| `designed -> in-progress` | Issue #24 已建；分支 `feat/24-pro-hero-interactions` 从 dev（`048e7c6`）开出            | 归枢记录   | 2026-10-08 |
| `in-progress -> self-tested` | hero pro 重做（六类手法）；typecheck / oxlint / SSR / 交互与降级均验证               | 归枢记录   | 2026-10-08 |
| `self-tested -> done`     | 交互与 reduced-motion 降级经真实浏览器验证；提交并本地 squash 合入 dev；Issue #24 回填关闭 | 归枢记录 | 2026-10-08 |

## Grill：开工前对齐

- 目标：① 按新定位重做 hero pro（压缩+tooltip / 折叠 / 三维动效 / 图表联动，外加卡片与条目的 hover 与入场 stagger）；② 把新定位与手法清单写进文档；③ 卡片 hover 补齐到 pro。
- 边界：只改 `hero/ResumeHeroPro.vue`、`assets/css/resume.css`（pro 卡片 hover）、`docs/dev/resume-styles.md`；不改对外契约、不动 minimal / standard、不动其余区块。
- 不做：不引第三方动画 / 图表库；不做整页模板；不做纯装饰特效（见 §14.3）。
- 涉及文件 / 模块：`apps/web/layers/11-public-resume/app/components/resume/hero/ResumeHeroPro.vue`、`apps/web/layers/11-public-resume/app/assets/css/resume.css`、`docs/dev/resume-styles.md`。
- 风险与未知：① 交互多、SSR 验证不到，必须真浏览器验；② tooltip 依赖 `UTooltip` 行为（hover 触发条件）；③ 交互可能损害可读性（文字必须仍是主体）；④ 动效多，`prefers-reduced-motion` 降级必须完整。
- 验收：见 `Issue #24`。
- 第一刀：先落「压缩 + tooltip + 复制」与「折叠」两条最能体现"维度转换"的手法，再补 3D 与图表联动。
- 过门判断：`可开工`。

## 设计与决策

| 决策 | 理由 / 证据 | 确认者 | 日期 |
| ---- | ----------- | ------ | ---- |
| **pro 的定位重设为「展示形式的维度转换」** | Owner 实看后判定原「版式更讲究」不足以体现精致；新定位 = 同一份信息换一种读法（能悬停展开 / 能折叠 / 能跟随三维 / 能联动图表），文字仍是主体 | Owner 确认 | 2026-10-08 |
| **手法清单入文档**（§14.2）+ **「不算维度转换」清单**（§14.3） | 避免后续变成"堆动画"：调色/阴影属于 token 层（§12.1 手段 ①），不占 pro 的差异额度；纯装饰粒子 / 循环动画不做 | Owner 要求记录 | 2026-10-08 |
| 联系方式：**压缩胶囊 + tooltip + 点击复制（含成功反馈）** | 原实现是一行行完整文字，占满窄栏；压缩后信息密度与可读性双赢，tooltip 仍能拿到完整值 | 归枢起草 | 2026-10-08 |
| INTRO：**`line-clamp` + 展开按钮**，阈值按最窄栏估 | 原实现阈值 84 比"被 clamp 的实际容量"还大 → 会出现「内容已截断但按钮不显示」；按 300px 栏 ≈ 12 字/行 × 3 行 取 **48** | 归枢记录（实测缺陷） | 2026-10-08 |
| 画廊：**鼠标跟随倾斜 ≤ 8° + 跟随高光** | 平面 → 有纵深的三维动效；角度克制（8°）以免影响阅读 | 归枢起草 | 2026-10-08 |
| 雷达：**与图例双向联动**（轴 / 顶点 / 图例同时高亮），图例可 `tabindex="0"` | 图表联动属"交互维度"；键盘也能拿到同一信息（`@focus` 同效） | 归枢起草 | 2026-10-08 |
| **卡片 hover 补齐到 pro**（`resume.css`） | 原先 `.resume-card[data-style='standard']:hover` 只匹配 standard → **pro 卡片没有 hover 抬升**（Owner 明确要求"Card 部分加 hover 交互"） | 归枢记录（实测缺陷） | 2026-10-08 |
| 复制用 `navigator.clipboard`，失败静默 | 非安全上下文 / 无权限时不应报错；tooltip 里始终能看到完整值，不因复制失败而丢失信息 | 归枢起草 | 2026-10-08 |

## 执行与验证

| 类型   | 命令 / 样本 / 链接 | 结果 | 仍未验证的边界 |
| ------ | ------------------ | ---- | -------------- |
| 机器验 | `pnpm --filter @template/web typecheck`；`oxlint apps/web packages` | 通过；oxlint 0 warning / 0 error（59 files） | `format:check` 是 DAO-006 的范围（他人正在收口） |
| 结构验 | 文件从 383 → 666 行；六类手法集中在本文件；跨区块零件样式仍在 `resume.css`（未把一次性样式塞进全局） | 通过 | — |
| 意图验 | SSR 抓 pro 档 `/resume`（临时切 mock `style.id`，已还原）：`.pro-gallery` 1 / `.pro-contact` 5 / `.pro-more` 1 / `.pro-radar-row` 6 / `.pro-reveal` 9 | 通过；无 `Failed to resolve component` / `NUXT_E*` | — |
| 意图验 | **真实浏览器**（playwright 1.58 + 本机 chromium）交互验证 | **全过**：① tooltip `data-state=delayed-open` + popper 出现 + DOM 含「点击复制」；② 复制点击后 `.is-copied` 出现、剪贴板内容 = `全日制本科 · 软件工程`、1.6s 后自动复原；③ 折叠：`pro-clamp` 存在 → 展开后消失；④ 3D：鼠标移动后 `transform` 矩阵变为含 rotateX/rotateY 的值；⑤ 雷达联动：hover 图例后 `.pro-radar-axis/.pro-radar-dot/.pro-radar-row` 各 1 个 `.is-active` | 卡片/chip 的 hover 为 CSS 规则，未逐项断言（但 reduced-motion 下已确认被关闭） |
| 意图验 | **`prefers-reduced-motion: reduce`** 降级 | 通过：`.pro-gallery` `transform: none`、`.pro-reveal` `animation-name: none`、状态点 `animation-name: none`、`.pro-contact` `transition-duration: 0s` | — |

## 交接

- 已完成：hero pro 六类手法（压缩+tooltip+复制 / 折叠 / 3D 倾斜+跟随高光 / 图表联动 / 状态反馈 / 入场 stagger）；`resume.css` 的卡片 hover 补齐 pro；文档 §14（定位 + 手法清单 + 不算维度转换的清单 + 硬约束 + 落地状态），并回填 §11.1 的旧定位。
- 当前状态：`done`
- 阻塞：无。
- 下一步第一刀：本卡无下一步。**后续按 §14 的新定位推进**：① `experience` / `skills` 的 pro 目前是"静态排版"型，需补交互（折叠成果列表 / tooltip / hover 联动）；② 未拆的 4 个区块落三档时**直接按新定位写**，别先做静态版再返工。
- 文档锚点：`Issue #24`、`docs/dev/resume-styles.md` §14
- 集成锚点：`已集成（3f62063，本地 squash 合入 dev）`

## 收口与沉淀

- `dao-review` 结论：`可收口（质量门 + SSR + 交互 + 降级四类验证均通过）`
- 最终验证证据：见「执行与验证」表
- Git / PR：`本地 squash，无 PR：3f62063`
- 常规提交：`adf437e（feat，原分支上的功能提交）/ b63b574（docs+卡）`
- Dao Commit：`不适用`
- 沉淀候选：`候选观察` —— 「pro 档的差异应该是『同一信息的另一种维度』，而不是『更多装饰』」这条定位 + 手法清单，比"堆动效"更可执行；配合 §12 的三手段分层，构成一套可复用的"多档风格"方法。React 版同样会遇到，值得对照。
- 收口备注：本轮实测修掉两个真实缺陷 —— ① INTRO 阈值大于 clamp 容量（内容被截但无法展开）；② 卡片 hover 只写了 standard 选择器（pro 无 hover）。两者都属于"加法做了但没覆盖全档"的典型。
- 并行情况：本地 squash 时发现 `feat/24` 分支上被并行会话追加了 3 个提交（`d0c7226` 按新 oxfmt 口径重排全仓、`91eb18f` 修「模板多语句内联表达式被折行导致 build 失败」、`adf437e` 文档），已随本次 squash 一并进入 dev —— 内容正确，但作者归属被压平；若他们还打算单独合入，需先确认避免重复。
