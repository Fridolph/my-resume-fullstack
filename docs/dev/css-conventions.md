# CSS / Tailwind 基础约定

统一 `apps/web` 与 `apps/admin` 的样式与风格，避免随意 Tailwind 类与 Nuxt UI 默认样式混杂。

- 通用样式入口：`apps/<app>/app/assets/css/main.css`
- 业务域样式：放在对应 layer 内（例：`apps/web/layers/11-public-resume/app/assets/css/resume.css`），由该 layer 的 `nuxt.config.ts` 通过 `css: [...]` 注册

## 1. 响应式：移动优先 + 内容最大宽度 1920px

- **移动优先**：默认样式即移动端；按断点向上增强。
- 断点对齐 Tailwind 默认：`sm`(640) / `md`(768) / `lg`(1024) / `xl`(1280) / `2xl`(1536)。
- **内容最大宽度 1920px**：`2xl` 及以上、乃至 2k/4k（2560/3876px）屏幕，内容区统一按 1920px 封顶，不再变宽。
- **Header 保持全宽**（`w-full`），内容区用 `content-max`。

已提供 token 与工具类（`main.css`）：

```css
@theme {
  --container-1920: 1920px; /* 生成 max-w-1920 工具类 */
}

/* 内容区封顶 1920 并居中：mx-auto w-full max-w-1920 */
@utility content-max {
  @apply mx-auto w-full max-w-1920;
}
```

用法：

| 场景                               | 写法                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| 内容区（含页头与正文容器）         | `class="content-max"`                                |
| admin 的 `layouts/has-sidebar.vue` | 同 `content-max`（原写 `mx-auto w-full max-w-1920`） |

> web 侧现状：简历展示页的页头、正文容器与 `12-ai-talk` 页均已用 `content-max`；`max-w-6xl` 不再出现。
> `docs` / `demo` 这类布局本身 `max-w-5xl/7xl`（< 1920），无需额外封顶。

## 2. 间距约定

| 场景                 | 取值                                          |
| -------------------- | --------------------------------------------- |
| 移动端（默认）       | `p-1`~`p-2`（4~8px），视情况                  |
| 桌面 / 便携（md~lg） | 内边距 `p-2`（8px），外边距最大 `m-4`（16px） |
| 大屏（xl 及以上）    | 内/外边距 `p-4`~`p-6`（16~24px）              |

统一页面留白工具类（`main.css` 的 `@utility`，**admin 侧已用**）：

```css
@utility content-pad {
  @apply p-2 md:p-4 2xl:p-6;
}
```

- 页面 / 内容区根元素统一用 `content-pad`，不再手写 `p-4 sm:p-6` 之类散值。
- 卡片、表格、表单内部的细粒度间距仍按局部需要用小工具类，但整体「页面级留白」走 `content-pad`。
- 展示类页面若要与旧站（`my-resume`）观感一致，横向留白用 `px-4 sm:px-6`（旧站同款），不与 `content-pad` 混用。

## 3. 类名长度 → BEM + @apply，业务域类放 layer

- 优先使用 Tailwind 原子类直接写在 `class`，Tailwind 主要用在**布局与灵活调整**上。
- **当单个 `class` 超过 12 个类时**，抽离为 BEM 命名，用 `@apply` 书写，避免模板里一长串难读、难维护的类。

```css
/* 好：过长的原子类抽成 BEM */
@layer components {
  .nav-link {
    @apply min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-highlighted;
  }
}
```

- BEM 是为解决复杂度，不为制造层级：只含少量属性的短类不要抽。
- 抽离后仍保持 `@apply` 风格，不回退大段原生 CSS（**例外**：需要 CSS 变量、`color-mix()`、`@media (hover: hover)` 这类 `@apply` 表达不了的声明，直接写原生 CSS）。
- **跨组件复用的单位属性**（同一段 `:style="{ color: 'var(--x)' }"` 重复 N 次）属于「可复用」，也要抽成类，而不是留在每个组件里 —— 见 §7。

## 4. 与 Nuxt UI 的配合

- 组件样式优先用 `ui` / `class` prop 覆盖，避免深改 Nuxt UI 内部结构。
- ⚠️ Nuxt UI 默认主题常用**响应式变体**（`sm:p-6`、`md:gap-*`）。覆写时如果只改 base 档（`p-0`），响应式档（`sm:p-6`）在对应断点仍会生效——必须同时覆写对应档（`p-0 sm:p-0`），详见 [admin-ui-patterns.md](./admin-ui-patterns.md)。
- **全站唯一用法**的覆写收敛到 `app.config.ts`，不在组件里散写 `:ui`：

  ```ts
  // apps/web/app.config.ts
  export default defineAppConfig({
    ui: {
      colors: { primary: 'indigo', neutral: 'slate' },
      drawer: { slots: { content: 'w-full sm:max-w-md' } },
    },
  })
  ```

  > 只收敛「所有实例都该一致」的覆写；实例特例（如编辑抽屉要 `max-w-3xl`、登录弹窗要默认宽度）留在组件上。

- **让 Nuxt UI 组件跟随业务主题**：Nuxt UI 的语义色由 CSS 变量驱动，可在业务容器/页面注入处覆盖：

  ```css
  --ui-primary: var(--resume-primary); /* 按钮 / 徽标 / 滑块跟随业务主色 */
  --ui-radius: 0.75rem; /* 与业务卡片圆角呼应 */
  ```

  ⚠️ 覆盖点若挂在**内容容器**上，teleport 到 `body` 的弹窗 / 抽屉拿不到 —— 必须注入到 `<body>`，见 §7。

## 5. 常见落点速查

| 需求            | 写法                                                             |
| --------------- | ---------------------------------------------------------------- |
| 内容区封顶 1920 | `class="content-max"`                                            |
| 页面内容区留白  | `class="content-pad"`（admin）/ `px-4 sm:px-6`（展示页对齐旧站） |
| Header          | 保持全宽，不加 max-w                                             |
| 主标题          | `text-xl font-semibold tracking-tight text-highlighted`          |
| 次要说明文字    | `text-sm leading-6 text-muted`                                   |
| 次级 / 弱化文字 | `text-xs text-dimmed`                                            |
| 业务域文字色    | `.resume-text` / `.resume-muted` / `.resume-accent`（见 §7）     |

## 6. 动效与打印

- **动效**：`apps/admin` 的 `main.css` 已引入 `tw-animate-css`（`@import "tw-animate-css"`），可直接用 `animate-in` / `animate-out` / `fade-in` 等工具类；`apps/web` 目前未引入，需要时再加。
- **打印 / PDF**：`apps/admin` 的 `main.css` 内置命名页打印样式——`@page portrait/landscape`、`.pdf-page[data-orientation="…"]`、`.pdf-pages-wrapper`、`.break-inside-avoid`，PDF 页面直接复用。
- 通用工具类：`.scrollbar-hidden`（隐藏滚动条）、`.box-shadow-none`（去阴影）。

## 7. 样式分层：通用 vs 业务域

| 层       | 放什么                                     | 落点                                                                                                  |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| app 通用 | 容器宽度 / 页面留白 / 光标 / 滚动条 / 打印 | `apps/<app>/app/assets/css/main.css`                                                                  |
| 业务域   | 域内复用的语义类、域变量默认值             | `<app>/layers/<NN>-<域>/app/assets/css/<域>.css`，在该 layer 的 `nuxt.config.ts` 用 `css: [...]` 注册 |

### 业务域语义类的做法（以简历展示域为例）

`apps/web/layers/11-public-resume/app/assets/css/resume.css` 承载两类东西：

1. **变量默认值集中声明**（`--resume-*`、`--resume-card-*`），组件里因此不必再写 `var(--x, fallback)` 兜底。
2. **语义类**，跨组件复用：

   | 类                                                  | 用途                                                        |
   | --------------------------------------------------- | ----------------------------------------------------------- |
   | `.resume-card`                                      | 卡片外壳（边框 / 圆角 / 内边距 / 表面 / 阴影 / hover 动效） |
   | `.resume-text` / `.resume-muted` / `.resume-accent` | 正文 / 次要 / 强调文字色                                    |
   | `.resume-title`                                     | 区块标题字号（由风格变量决定）                              |
   | `.resume-eyebrow`                                   | 大写小字分组标题（与旧站 `.web-eyebrow` 一致）              |
   | `.resume-label`                                     | 设置面板字段标签                                            |
   | `.resume-chip`                                      | 标签胶囊                                                    |
   | `.resume-btn-group`                                 | 按钮 / 徽标组（`flex flex-wrap gap-2`）                     |

   收益：组件里 30+ 处 `:style="{ color: 'var(--resume-…)' }"` 与重复的按钮组类被替换成语义类；Tailwind 类回到「布局与灵活调整」。

### 变量要注入到 `<body>`，不是内容容器

页面按配置生成主题 / 风格变量后，**注入到 `<body>`**（`useHead({ bodyAttrs: { style } })`），而不是挂在内容容器上：

```ts
useHead({
  bodyAttrs: {
    style: computed(() =>
      Object.entries(resumeVars.value)
        .map(([k, v]) => `${k}:${v}`)
        .join(';'),
    ),
  },
})
```

原因：`UModal` / `UDrawer` 等是 **teleport 到 `body`** 的，挂在内层容器上的 CSS 变量它们解析不到，控件颜色 / 圆角就不会跟随主题。
