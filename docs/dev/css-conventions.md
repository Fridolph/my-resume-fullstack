# CSS / Tailwind 基础约定

统一 `apps/admin` 的样式与风格，避免随意 Tailwind 类与 Nuxt UI 默认样式混杂。基础文件：`apps/admin/app/assets/css/main.css`。

## 1. 响应式：移动优先 + 内容最大宽度 1920px

- **移动优先**：默认样式即移动端；按断点向上增强。
- 断点对齐 Tailwind 默认：`sm`(640) / `md`(768) / `lg`(1024) / `xl`(1280) / `2xl`(1536)。
- **内容最大宽度 1920px**：`2xl` 及以上、乃至 2k/4k（2560/3876px）屏幕，内容区统一按 `max-w-1920`（1920px）封顶，不再变宽。
- **Header 保持全宽**（`w-full`），但 `main` / 主内容区用 `max-w-1920 mx-auto`。

已提供 token（`main.css` 的 `@theme`）：

```css
@theme {
  --container-1920: 1920px;   /* 生成 max-w-1920 工具类 */
}
```

用法：`class="mx-auto w-full max-w-1920"`。当前已应用于 `layouts/has-sidebar.vue` 的 `<main>`；`docs` / `demo` 布局本身 `max-w-5xl/7xl`（< 1920），无需额外封顶。

## 2. 间距约定

| 场景 | 取值 |
|---|---|
| 移动端（默认） | `p-1`~`p-2`（4~8px），视情况 |
| 桌面 / 便携（md~lg） | 内边距 `p-2`（8px），外边距最大 `m-4`（16px） |
| 大屏（xl 及以上） | 内/外边距 `p-4`~`p-6`（16~24px） |

已提供统一页面留白工具类（`main.css` 的 `@utility`）：

```css
@utility content-pad {
  @apply p-2 xl:p-4 2xl:p-6;
}
```

- 页面/内容区根元素统一用 `content-pad`，不再手写 `p-4 sm:p-6` 之类散值。
- 卡片、表格、表单内部的细粒度间距仍按局部需要用小工具类，但整体「页面级留白」走 `content-pad`。

## 3. 类名长度 → BEM + @apply

- 优先使用 Tailwind 原子类直接写在 `class`。
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
- 抽离后仍保持 `@apply` 风格，不回退大段原生 CSS。

## 4. 与 Nuxt UI 的配合

- 组件样式优先用 `ui` / `class` prop 覆盖，避免深改 Nuxt UI 内部结构。
- ⚠️ Nuxt UI 默认主题常用**响应式变体**（`sm:p-6`、`md:gap-*`）。覆写时如果只改 base 档（`p-0`），响应式档（`sm:p-6`）在对应断点仍会生效——必须同时覆写对应档（`p-0 sm:p-0`），详见 [admin-ui-patterns.md](./admin-ui-patterns.md)。

## 5. 常见落点速查

| 需求 | 写法 |
|---|---|
| 页面内容区留白 | `class="content-pad"` |
| 内容区封顶 1920 | `class="mx-auto w-full max-w-1920"` |
| Header | 保持全宽，不加 max-w |
| 主标题 | `text-xl font-semibold tracking-tight text-highlighted` |
| 次要说明文字 | `text-sm leading-6 text-muted` |
| 次级/弱化文字 | `text-xs text-dimmed` |

## 6. 动效与打印（已内置）

- **动效**：`main.css` 已引入 `tw-animate-css`（`@import "tw-animate-css"`），可直接用 `animate-in` / `animate-out` / `fade-in` 等工具类给组件加过渡动效。
- **打印/PDF**：`main.css` 内置命名页打印样式——`@page portrait/landscape`、`.pdf-page[data-orientation="…"]`、`.pdf-pages-wrapper`、`.break-inside-avoid`，后续 PDF 页面直接复用这些类即可。
- 通用工具类：`.scrollbar-hidden`（隐藏滚动条）、`.box-shadow-none`（去阴影）。
