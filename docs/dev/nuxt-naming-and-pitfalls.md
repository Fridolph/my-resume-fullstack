# Nuxt 命名规则与高频踩坑

本仓库是 Nuxt 4 + Nuxt UI 4。文件命名与自动导入有一套默认规则，写错不会立刻报错，会在运行时以「组件不渲染 / 布局不生效」的形式暴露。以下是踩过的坑与统一规范。

## 1. 布局命名：文件名必须是 kebab-case

Nuxt 把**布局文件名转成 kebab-case** 作为布局名。

| 文件名 | 布局名（`definePageMeta` 里用） | 是否正确 |
|---|---|---|
| `has-sidebar.vue` | `"has-sidebar"` | ✅ |
| `hasSidebar.vue` | 类型检查报错：`Did you mean '"has-sidebar"'` | ❌ |
| `empty.vue` | `"empty"` | ✅ |
| `demo.vue` | `"demo"` | ✅ |

**规范**：布局文件一律用 kebab-case 命名（如 `has-sidebar.vue`、`project-detail.vue`），页面里 `layout: "has-sidebar"`。

> 注意：kebab-case 只针对**布局文件名**。组件文件仍是 PascalCase（见下节），两者不要混用。

## 2. 组件自动命名：目录前缀 + 文件名（带前缀则去重）

组件放在 `components/` 下，Nuxt 按「**目录名（首字母大写）作为前缀 + 文件名（PascalCase）**」生成组件名；**若文件名已经以该前缀开头，则前缀去重**。

真实例子（对照 `.nuxt/types/components.d.ts`）：

| 文件路径 | 自动组件名 | 说明 |
|---|---|---|
| `components/admin/AdminHeader.vue` | `AdminHeader` | 文件名已以 `Admin` 开头 → 去重 |
| `components/admin/AdminSidebar.vue` | `AdminSidebar` | 同上 |
| `components/admin/UserMenu.vue` | `AdminUserMenu` | 文件名不以 `Admin` 开头 → 加前缀 |
| `components/auth/AuthSplitLayout.vue` | `AuthSplitLayout` | 文件名已以 `Auth` 开头 → 去重 |
| `components/auth/LoginForm.vue` | `AuthLoginForm` | 文件名不以 `Auth` 开头 → 加前缀 |
| `components/auth/AdminLoginForm.vue` | `AuthAdminLoginForm` | 前缀 + 文件名拼接 |

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
pnpm --filter @template/admin typecheck

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

`pnpm --filter @template/web typecheck` 全程通过，只有起 dev server 抓页时才以 500 暴露。同类破损还有：删掉 style 时连带删掉属性间空格、标签属性被截断。

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
