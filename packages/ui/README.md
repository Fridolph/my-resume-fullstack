# packages/ui —— 跨 app 共享的 UI 组件（Nuxt layer）

web 与 admin 都要用的 **Vue / Nuxt UI 组件**放这里。它是一个 **Nuxt layer**（不是 npm 包）：

- **零构建**：源码级共享，改完 web / admin 都会 HMR
- **自动导入**：`app/components/**` 里的组件在宿主里直接用，不需要 `import`
- **类型自动生成**：宿主 `nuxt prepare` 时进 `.nuxt/components.d.ts`，无需手写 d.ts

## 与 packages/common 的分工

| 包                | 放什么                                                | 形态                       | 消费方式                               |
| ----------------- | ----------------------------------------------------- | -------------------------- | -------------------------------------- |
| `packages/common` | 框架无关的**纯 TS**：类型、常量、纯函数               | 需要 `tsc` 构建（`dist/`） | `import { … } from '@template/common'` |
| `packages/ui`     | **Vue / Nuxt UI 组件**（依赖 `@nuxt/ui`、Vue 运行时） | Nuxt layer，不构建         | 自动导入（组件名即文件名）             |

判断标准：**能不能脱离 Vue 编译运行**。能 → `common`；不能（含模板 / 依赖 UI 库）→ `ui`。

## 消费方式

两个 app 的 `nuxt.config.ts` 各有一行：

```ts
export default defineNuxtConfig({
  extends: ['../../packages/ui'],
  // …
})
```

⚠️ 还需要让 Tailwind 扫到这个目录（Tailwind v4 默认**不扫** app 目录之外的源码），
所以在 `apps/*/app/assets/css/main.css` 里有：

```css
@source "../../../../../packages/ui";
```

新增共享组件时**不用**改这两处。

**依赖约定**：layer 不声明运行时依赖 —— `vue` 与 `@nuxt/ui` 由宿主提供。所以组件里直接用自动导入的 `ref` / `computed` / `UButton`，**不要**写 `import { ref } from 'vue'`（那样会按 `packages/ui/node_modules` 解析而找不到）。需要额外能力时优先自己写：`app/composables/useNarrowScreen.ts` 就是用来替代 `@vueuse/core` 的 `useMediaQuery`，避免给两个 app 各加一份依赖。

## 组件

### `MyDrawer` —— 抽屉

```vue
<MyDrawer v-model:open="open" title="标题" description="说明" direction="right" size="md">
  <template #trigger>
    <UButton label="打开" />
  </template>

  正文内容（默认槽）

  <template #footer="{ cancel, confirm }">
    <div class="flex justify-end gap-2">
      <UButton color="neutral" variant="ghost" label="取消" @click="cancel" />
      <UButton label="保存" @click="confirm" />
    </div>
  </template>
</MyDrawer>
```

### `MyModal` —— 对话框（移动端退化为抽屉）

桌面用 `UModal`；**宽度小于 `breakpoint`（默认 768px）时退化为抽屉**（移动端键盘友好）。
内部复用 `MyDrawer`，因此两个组件的动作区与关闭语义完全一致。

```vue
<MyModal
  v-model:open="open"
  title="编辑资料"
  :breakpoint="768"
  mobile-direction="bottom"
  footer-text="改动会实时保存"
  show-actions
  confirm-text="保存"
  :loading="saving"
  @confirm="submit"
>
  <template #trigger><UButton label="编辑" /></template>
  <UForm>…</UForm>
</MyModal>
```

### 共有 API

| 类别             | 内容                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v-model:open`   | 打开状态（也支持 `useOverlay` 那样默认打开）                                                                                                         |
| props            | `title` / `description` / `size` / `dismissible` / `footerText` / `showActions` / `confirmText` / `cancelText` / `loading` / `closeOnConfirm` / `ui` |
| `MyDrawer` 专属 | `direction`（`top` / `right` / `bottom` / `left`）                                                                                                   |
| `MyModal` 专属  | `breakpoint`、`mobileDirection`                                                                                                                      |
| slots            | `trigger` / 默认（body）/ `header` / `title` / `description` / `actions` / `close` / `footer`                                                        |
| emits            | `confirm`、`cancel`、`close(confirmed?)`                                                                                                             |

约定：

- **隐式关闭统一**：点遮罩 / Esc / 滑动都走同一个 `close()`，且只 emit 一次（Reka 在关闭动画后还会再触发一次 `update:open(false)`）
- **内置动作区**：`show-actions` 时 footer 渲染「取消 / 确认 + footerText」，`loading` 会挂到确认按钮上；`close-on-confirm=false` 适合"异步提交成功后才关"
- **`#footer` 优先**：给了 `#footer` 就完全接管，不再渲染内置动作区
- **不需要 `ClientOnly`**：浮层面板只在 `open` 为真时渲染，SSR 首屏里不会出现（`MyModal` 的断点判断用 `useMediaQuery(..., { ssrWidth })` 避免服务端 / 客户端分支不一致）

## 新增一个共享组件的步骤

1. 在 `packages/ui/app/components/` 建 `AppXxx.vue`（文件名即自动导入名）
2. 组件内**只用宿主提供的东西**（`UButton` 等 Nuxt UI 全局组件）与 layer 自己的 `app/utils/**`；
   **不要**引 `~/utils/…`、`~~/…` 这类宿主路径 —— 那是 app 私有代码，layer 里解析不到或者会反向依赖
3. 需要新依赖时，加在 `packages/ui/package.json`（layer 自己的依赖，不污染 app）
4. 在 admin 的 demos 页（`apps/admin/layers/20-comps/app/pages/demos/`）补用例，并在
   `apps/admin/app/config/admin-navigation.ts` 挂上入口
5. 两端跑 `pnpm --filter @template/web typecheck && pnpm --filter @template/admin typecheck`

## 为什么不用 npm 包

`packages/comps` 那种做法需要：vite lib 构建、导出 d.ts、处理 `vue` / `@nuxt/ui` 的 peer 与样式、
消费方手动 `import`。而本项目共享的是"依赖宿主的 Nuxt UI + Tailwind"的组件 —— 走 layer 才是这套栈的
原生方式：**零构建、自动导入、类型自动生成、改完两边立刻生效**。
（只有一个例外值得将来再评估：如果共享组件要脱离 Nuxt 给非 Nuxt 工程用，才需要退回 npm 包形态。）

## 命名与透传约定

- 本层自行封装的组件统一用 **`My` 前缀**（`MyDrawer` / `MyModal` / …）：与 Nuxt UI 的 `U*`
  区分开，一眼能看出"这是我们的封装"；文件名即组件名（宿主里自动导入）；
- 封装组件一律 `defineOptions({ inheritAttrs: false })` + 显式 **`v-bind="$attrs"`**：
  调用方传的 `class` / `id` / `aria-*` / 事件会落到**底层浮层组件**上，且只绑一处，不会双重绑定。
  （`MyModal` 的根是 `v-if` / `v-else` 两个分支，属于多根组件 —— 不显式透传，Vue 无处挂载并会告警）
- **头尾固定、内容滚动**：`content` 是 `flex flex-col`，`body` 用 `contents`
  把内层滚动 div 提升为 flex 子项（`flex-1 overflow-y-auto`），header / footer 作为兄弟节点
  `shrink-0` —— 于是 `#header` / `#footer` 天然钉在顶部 / 底部，不随内容滚动（不需要 CSS sticky）。
