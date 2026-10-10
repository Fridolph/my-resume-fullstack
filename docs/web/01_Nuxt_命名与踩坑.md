# Nuxt 命名规则与高频踩坑

本仓库是 Nuxt 4 + Nuxt UI 4。文件命名与自动导入有一套默认规则，写错不会立刻报错，会在运行时以「组件不渲染 / 布局不生效」的形式暴露。以下是踩过的坑与统一规范。

## 1. 布局命名：文件名必须是 kebab-case

Nuxt 把**布局文件名转成 kebab-case** 作为布局名。

| 文件名            | 布局名（`definePageMeta` 里用）              | 是否正确 |
| ----------------- | -------------------------------------------- | -------- |
| `has-sidebar.vue` | `"has-sidebar"`                              | ✅       |
| `hasSidebar.vue`  | 类型检查报错：`Did you mean '"has-sidebar"'` | ❌       |
| `empty.vue`       | `"empty"`                                    | ✅       |
| `demo.vue`        | `"demo"`                                     | ✅       |

**规范**：布局文件一律用 kebab-case 命名（如 `has-sidebar.vue`、`project-detail.vue`），页面里 `layout: "has-sidebar"`。

> 注意：kebab-case 只针对**布局文件名**。组件文件仍是 PascalCase（见下节），两者不要混用。

## 2. 组件自动命名：目录前缀 + 文件名（带前缀则去重）

组件放在 `components/` 下，Nuxt 按「**目录名（首字母大写）作为前缀 + 文件名（PascalCase）**」生成组件名；**若文件名已经以该前缀开头，则前缀去重**。

真实例子（对照 `.nuxt/types/components.d.ts`）：

| 文件路径                              | 自动组件名           | 说明                             |
| ------------------------------------- | -------------------- | -------------------------------- |
| `components/admin/AdminHeader.vue`    | `AdminHeader`        | 文件名已以 `Admin` 开头 → 去重   |
| `components/admin/AdminSidebar.vue`   | `AdminSidebar`       | 同上                             |
| `components/admin/UserMenu.vue`       | `AdminUserMenu`      | 文件名不以 `Admin` 开头 → 加前缀 |
| `components/auth/AuthSplitLayout.vue` | `AuthSplitLayout`    | 文件名已以 `Auth` 开头 → 去重    |
| `components/auth/LoginForm.vue`       | `AuthLoginForm`      | 文件名不以 `Auth` 开头 → 加前缀  |
| `components/auth/AdminLoginForm.vue`  | `AuthAdminLoginForm` | 前缀 + 文件名拼接                |

### 踩坑现场

- 写了 `<AdminLoginForm>`，但组件在 `components/auth/AdminLoginForm.vue`，实际组件名是 `AuthAdminLoginForm` → 运行时 `Failed to resolve component: AdminLoginForm`，表单整块不渲染。
- 写了 `<UserMenu>`，但组件在 `components/admin/UserMenu.vue`，实际组件名是 `AdminUserMenu` → 同样解析失败。

### 排查方法（关键）

组件名写对没有，**不要靠猜，直接看生成结果**：

```bash
cat apps/admin/.nuxt/types/components.d.ts
```

里面列出的 key 就是模板里能直接用的组件名（`AdminUserMenu`、`AuthLoginForm`…）。

### 规范

1. 组件文件用 PascalCase 命名。
2. 放在哪个目录，就接受「目录前缀 + 文件名」的最终组件名。
3. 想让组件名干净：
   - 目录 `admin/` 下的组件，文件名尽量以 `Admin` 开头（`AdminSidebar.vue` → `AdminSidebar`）。
   - 目录 `auth/` 下的组件，文件名尽量以 `Auth` 开头（`AuthSplitLayout.vue` → `AuthSplitLayout`），或直接命名 `LoginForm.vue` → `AuthLoginForm`。
4. 模板里用最终组件名；类型检查**不会**报「组件名写错」（未解析组件被当作 fallback），所以一定要靠 `.nuxt/types/components.d.ts` 或运行时 SSR 输出核对。

## 3. `app.vue` 必须用 `<NuxtLayout>` 包裹 `<NuxtPage>`

只要项目里有 `layouts/` 目录，`app.vue` 就必须：

```vue
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

**坑**：只写 `<NuxtPage />` 不包 `<NuxtLayout>` 时，**所有布局静默失效**（页面直接裸渲染，无侧栏/顶栏），并产生告警：

```
NUXT_E4007: Your project has layouts but the `<NuxtLayout />` component has not been used.
```

`layout: false` 的页面（如登录页）不受影响，但 `layout: "has-sidebar"` 的页面会全部失效。

## 4. 统一验证流程

改完结构/命名后，不要只看「没报错」，至少做两步：

```bash
# 1. 类型检查（能抓到布局名 camelCase 这类错误）
pnpm --filter @rs/admin typecheck

# 2. 起 dev server 实测 SSR（能抓到组件解析失败、布局失效这类运行时问题）
cd apps/admin && pnpm exec nuxt dev --host 0.0.0.0 --port 4020
curl -s http://localhost:4020/<path> | grep -o -i 'Failed to resolve component\|NUXT_E[0-9]*\|missing template'
```

判断标准：

- `typecheck` 无 error。
- SSR HTML 里能找到预期的 `<input>` / 标题 / `admin-sidebar` 等关键节点。
- 无 `Failed to resolve component` / `NUXT_E*` / `missing template` 告警。

## 5. 批量改模板后必须跑 SSR（typecheck 抓不到模板破损）

**教训**：用脚本批量替换 `.vue` 模板（例如把 `:style="{ color: 'var(--x)' }"` 换成语义类、把相对 import 换成别名）时，`typecheck` 可能**通过**，但模板已经编译不过。

真实例子（2026-10-08，web 简历页样式统一）：批量插入 `class="resume-muted"` 时，脚本的正则把前导空格一起吃掉了，产出 `<spanclass="resume-muted">`：

```
Vite Error: .../ResumeEducationSection.vue — Invalid end tag.
```

`pnpm --filter @rs/web typecheck` 全程通过，只有起 dev server 抓页时才以 500 暴露。同类破损还有：删掉 style 时连带删掉属性间空格、标签属性被截断。

**规范**：

1. 批量替换后用脚本自检一遍「标签名与属性相连」这类破损：

   ```bash
   grep -rn --include='*.vue' -E '<[a-zA-Z]+(class|style|:|@)=' apps/web | grep -v node_modules
   ```

2. **必须**起 dev server 抓一次真实 SSR（不能只看 typecheck）：

   ```bash
   cd apps/web && pnpm exec nuxt dev --port 4023
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4023/resume   # 期望 200，不是 500
   curl -s http://localhost:4023/resume | grep -o 'Failed to resolve component\|NUXT_E[0-9]*\|Invalid end tag'
   ```

3. 500 响应在 dev 下会返回 JSON，直接读 `message` 字段即可定位是哪个文件：

   ```bash
   curl -s http://localhost:4023/resume | head -c 400
   ```

4. 大面积替换后，把「脚本 dry-run 输出」与「替换处数」一并记录下来（本次：语义类 33 处 + 按钮组 7 处 + fallback 10 处），便于复核是否漏改。

## 6. 不要在模板里写多语句内联表达式（oxfmt 会折行，Vue 不认）

**教训（2026-10-08，DAO-006 格式化基线）**：`oxfmt` 会把模板属性里的**多语句**表达式按 JS 语句折成多行：

```vue
<!-- 原来（单行、合法） -->
@update:value="item[field.key ?? ''] = $event; emit('change')"

<!-- 被格式化后（多行 → Vue 模板属性里非法） -->
@update:value=" item[field.key ?? ''] = $event emit('change') "
```

Vue 的模板属性只能放**单个表达式**，多语句会被拒 → 报错出现在**构建期**（`pnpm build`），
而 `typecheck` 与 `oxlint` 都不会报：

```text
[plugin vite:vue] .../ResumeSchemaForm.vue:152:32
RolldownError: Error parsing JavaScript expression: Unexpected token, expected "," (3:18)
```

**规范**：

1. 模板里一律**只写一个表达式**；需要「改值 + 派发事件」这类多步操作，抽成方法：
   ```vue
   @update:value="setItemValue(item, field.key ?? '', $event)"
   ```
2. `v-on` / `v-bind` 里不要出现 `;`（写 `;` 就等于给格式化工具留了一个折行陷阱）。
3. 改完模板要跑 **`pnpm build`**（不只是 `typecheck`）—— 模板内联表达式的语法错误只有编译/构建阶段才暴露。
4. 排查命令（找多语句内联表达式）：
   ```bash
   grep -rn --include='*.vue' -E '@[a-zA-Z:._-]+="[^"]*;' apps | grep -v node_modules
   ```

## 7. `<component :is>` 拼条件标签 + `UTooltip` 包裹 → 事件处理器静默不执行（2026-10-08）

**现场**：兴趣标签需要"可点时是 `<button>`、不可点时是 `<span>`"，写成

```vue
<UTooltip v-for="item in items" :key="item.id" :text="item.description">
  <component :is="clickable(item) ? 'button' : 'span'" @click="open(item)">
    …
  </component>
</UTooltip>
```

**症状**：渲染完全正常（`tagName`、`class`、`aria-label` 都对），点击**没有任何反应、控制台零报错**。
用 CDP 查这个元素的事件监听器，`click` **在**（`DOMDebugger.getEventListeners` 能看到）：

```js
const { result } = await client.send('Runtime.evaluate', {
  expression: 'document.querySelector(".hero-hobby.is-interactive")',
})
const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId })
// → click, focus, pointermove, pointerleave, pointerdown, blur
```

但处理函数就是不跑（在里面加 `console.log` 也没有输出）—— 是 `UTooltip`（reka-ui 的 `as-child`）
转发子节点时，和动态组件 vnode 的事件处理器没合到一起。

**规范**：

1. 需要「条件标签 + 事件」时，写成**两个显式的 `v-if` / `v-else` 元素**，不要用 `<component :is>` 拼标签：

   ```vue
   <UTooltip …>
     <button v-if="clickable(item)" type="button" @click="open(item)">…</button>
     <span v-else>…</span>
   </UTooltip>
   ```

2. 同理适用于其它 `as-child` 型包装（`UTooltip` / `UPopover` / `BDropdown` 之类）：
   里面的子元素**别用动态组件**。
3. 这类问题 `typecheck` / `oxlint` / SSR 抓取**全都抓不到** —— 必须真浏览器点一次
   （与 §5、§6 同一条教训：模板层的坑只有运行/编译期才现形）。

**排查手法（下次直接用）**：先 hook 目标行为确认「处理器没跑」而不是「状态没生效」：

```js
await ctx.addInitScript(() => {
  window.__calls = 0
  const show = HTMLDialogElement.prototype.showModal
  HTMLDialogElement.prototype.showModal = function (...a) {
    window.__calls += 1
    return show.apply(this, a)
  }
})
```

计数为 0 + 元素上有监听器 → 问题在「绑定/合并」层，而不是你的业务逻辑。
