# 简历编辑交互约定（拖拽 / 托盘 / 自动保存）

> 状态：**已实现**（`Issue #16`、`DAO-011`）
> 关联：[resume-display-architecture.md](./resume-display-architecture.md)（布局与编辑模式分期）、[resume-styles.md](./resume-styles.md)（风格维度）、[layers.md](./layers.md) §6（import 约定）

## 1. 三个概念

| 概念 | 含义 | 数据落点 |
| --- | --- | --- |
| **栏位 slot** | 模块属于 `side` / `main` / `rail` 哪一栏 | `config.sections.slot` |
| **顺序 order** | 全局阅读顺序（跨栏也是一条线） | `config.sections.order` |
| **托盘 tray** | 未使用的模块（不在页面上渲染） | `config.sections.hidden` |

分栏是**派生**出来的：先按 `order` 遍历，再用 `slot`（或注册表默认栏位）归位，最后按 `layout.mode` 做合并（`single` 全并入 main，`split` 把 rail 并入 main）。所以**同一栏内相邻 ≠ `order` 相邻**。

## 2. 拖拽语义

- **拖到哪一栏 = 定义该模块的 `slot`**。`split` 模式下只显示 side + main（rail 并入 main），所以把模块拖进 main 之后，切到三栏布局它就在中栏 —— 这是「拖拽即定义归属」的自然结果，不是 bug。
- **拖到托盘 = 隐藏**（写 `hidden`，**不动 `order`**）→ 再拖回来时它还在原来那一段位置附近。
- 编辑态下**空栏也渲染落点**（非编辑态空栏不渲染，布局自然塌陷）：否则"把一栏清空后"就再也没有目标容器可以拖回去。
- 每个模块另给**上移 / 下移**按钮（栏内相邻交换），作为键盘 / 触屏的替代入口；托盘里的模块还有「点回」恢复按钮。

### 落点怎么算（关键实现约定）

```text
落点锚 = (目标容器去掉被拖项后的数组)[newIndex]
        ↑ 用**渲染数据**算，不读 item.nextElementSibling
```

理由：`sortablejs` 拖拽时会**直接移动 DOM**，而 Vue 随后又要按新的 `order` 重排 —— 若再从 DOM 兄弟节点推落点，就是"两个人改同一块 DOM"，容易出现错位。用数据算则同栏排序与跨栏拖拽是同一套算法，且与 DOM 现状无关。

## 3. 自动保存

- **范围**：布局配置（拖拽 / 显隐 / 主题 / 风格 / 背景）与简历内容，**都自动保存**。
- **策略**：`watch(..., { deep: true })` → **600ms 防抖** → `persist()` → 更新保存状态。
- **只在编辑态（管理员）写盘**：访客浏览不碰 `localStorage`。
- **退出编辑态前兜底 `flushSave()`**：避免"刚拖完就退出登录"把改动留在防抖窗口里。
- **`loadLocal()` 后复位保存状态**：恢复数据本身不算"待保存的改动"（否则会立刻回写一次）。
- **唯一写盘点 `persist()`**：将来换成 `PUT /resume/display-config` 时只改这一个函数；自动保存与兜底 flush 都复用它。
- **UI**：头部显示「保存中… / 已自动保存 · 刚刚」，抽屉页脚显示同样状态，**不再有手动「保存」按钮**（两套入口会让人误以为"不点就不保存"）；保留「重置」。

存储键：

| 键 | 内容 |
| --- | --- |
| `my-resume.display-config` | 展示配置（布局 / 编排 / 选项 / 主题 / 背景 / 风格 / 品牌） |
| `my-resume.resume-content` | 简历内容 |
| `my-resume.admin` | 管理员会话（mock 登录，**不是鉴权**） |

## 4. 谁注入编辑能力

**区块组件永远不感知编辑态**：工具条（上移 / 下移 / 编辑 / 拖拽 / 隐藏）由 `ResumeColumn` 渲染，
拖拽实例、托盘挂载、落点计算都在 `ResumePageContainer`。
于是同一份区块组件既能服务公开站，也能给 admin 复用（见 [resume-display-architecture.md](./resume-display-architecture.md) §6）。

## 5. 避坑清单

1. **别从 DOM 读落点**（见 §2）：库改了 DOM，框架又要重排，读 DOM 必然在竞态里。
2. **空栏必须有 DOM**：编辑态下按 `layout.mode` 保留**有效**栏位（`single` → 只有 main；`split` → side + main；`threeColumn` → 三栏）。
3. **自动保存要 gate 在编辑态**，并且 `loadLocal()` 后复位状态 —— 否则初始加载会用默认值覆盖用户已保存的数据。
4. **托盘落点不写 `order`**：写 `order` 会让"藏了再拿出来"把模块挪到别处。
5. **栏内相邻交换 ≠ 交换 order 下标**：分栏是派生的，栏内相邻的两项在 `order` 里可能隔着一堆别的模块；只交换这两项在 `order` 中的位置即可。
6. `sortablejs` 的 `handle: '[data-drag-handle]'` 意味着**只有手柄能起拖**，托盘项与栏内项都要带手柄（否则整块都能拖，容易误触）。
