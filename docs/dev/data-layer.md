# 数据层约定（Pinia Colada + `$request`）

> 定义 `apps/admin` / `apps/web` 的数据获取约定：请求层、缓存层与错误处理的边界。
> 2026-10-07 起数据层统一用 `@pinia/colada`；模板遗留的 **alova 上传实例已于 2026-10-08 完成迁移**（原生 XHR + colada mutation）。

## 1. 分层与职责

```text
组件 / 页面
  └─ composables/useXxxQuery.ts   ← 组合 colada：key、query/mutation、失效策略
       └─ apis/xxx.ts             ← 纯请求函数：调 $request，不持有状态
            └─ plugins/httpRequest.ts（$request：baseURL / 鉴权头 / 解包 / 错误归一化）
```

- **组件不直接发请求**：页面只用 composable，拿 `data` / `status` / `error`。
- **`apis/` 只管取数**：不缓存、不 toast、不管 loading。
- **请求层只管协议**：解包统一响应，其余抛 `ApiError`。
- **缓存策略只在 composable**：`staleTime`、失效、乐观更新都在这一层。

## 2. 响应契约

唯一来源是 `packages/common`（`~/types/api` 只做类型转发）：

```ts
{ success: true, data: T, message: string, timestamp: string }
```

- HTTP 2xx 且 `success === true` → `$request` 返回 `data`，业务代码看不到包装层。
- 其余 → 抛 `ApiError`（带 `statusCode` / `data`），并触发 `api:error[:statusCode]` hook。

## 3. query key 规范

集中在 `app/lib/query-keys.ts`，结构为 `[scope, ...segments]`：

```ts
queryKeys.resume.draft(); // ['resume', 'draft']
queryKeys.resume.published("zh"); // ['resume', 'published', 'zh']
```

- `scope` 与业务域同名；域内细分放 segments，便于按前缀批量失效。
- 不在组件里手写 key 数组，避免失效范围对不上。

## 4. 失效与重取

```ts
const queryCache = useQueryCache();
queryCache.invalidateQueries({ key: queryKeys.resume.draft() });
```

- mutation 成功后由 **mutation 自己** 声明要失效的 key（写在 mutation 的 `onSuccess` 里），
  不让每个调用方各自记得刷新。
- 只有在确实要服务端最新值时才 `refresh()`，不用它替代失效策略。

## 5. 上传 / 进度 / 取消（已落地：原生 XHR + colada mutation）

- **为什么不用 `$request` / fetch**：colada 与 `$request` 都基于 fetch，**拿不到上传进度**、也无法取消一个已发出的请求体；
  XHR 的 `upload.onprogress` + `abort()` 才能同时满足「进度条」与「取消」。
- **分层**：
  - `apis/files.ts` 的 `uploadFiles` —— 纯请求函数（原生 XHR、进度回调、`AbortSignal`、按 `{ success, data, message }` 解包、取消抛 `AbortError`）；
  - `composables/useFileUploader.ts` —— colada `useMutation` 管状态（`uploading` / `progress` / `uploaded` / `error`），并保留校验与 `abort()`；
  - `composables/useUploadFile.ts` —— 遗留薄包装（仍可用，新代码请用 `useFileUploader`）。
- **约定**：
  - 进度用 `FileUploadProgress`（`{ loaded, total, percent }`）暴露，不使用 `ref<number>` 这种丢信息的形状；
  - 上传请求**不可复用**进行中的请求（否则进度 / 取消会对错文件）——`useFileUploader` 每次上传前先 `abort()` 上一次；
  - 用户取消不算失败：`isAbortError` 统一识别（`utils/request.ts`）。

## 6. 现状与迁移

| 状态       | 内容                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 已接入     | `@pinia/nuxt` + `@pinia/colada-nuxt`；`$request` 契约对齐 `packages/common`；示例见 `useHealthQuery.ts`                                                                                        |
| 已完成迁移 | 上传链路：`apis/files.ts`（原生 XHR + 进度 + abort）、`useFileUploader`（colada mutation）、`useUploadFile`（遗留包装）；**`plugins/alova.ts` 与 `alova` / `@alova/adapter-xhr` 依赖均已移除** |
| 已验证     | SSR 首屏取数、失效重取（`/` 页面 Infrastructure check 卡片）；上传页 SSR（`/comps/upload`）                                                                                                    |
| 未验证     | 真实上传端到端（需要后端 `/masterData/file/multipleUpload`）；进度回调与取消的浏览器实际表现                                                                                                   |

## 7. 已知边界

- 鉴权：token 存 cookie（`my-resume.token`），请求层注入 `Authorization: Bearer`；登录 mutation 随 auth 模块落地。
- 本文件只写约定；具体模块的实施与验收在各自任务卡内完成。
