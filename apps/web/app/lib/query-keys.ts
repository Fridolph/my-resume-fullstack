/**
 * Query key 规范（Pinia Colada）。
 *
 * 结构 `[scope, ...segments]`，`scope` 与业务域同名（`resume` / `aiTalk`…）。
 * 只在本文件集中声明，便于按前缀批量失效。
 *
 * 目前为空：心跳属于"每次都要最新"的一类，已改走 `useAsyncData`（不进缓存）；
 * 首个**缓存型**查询（简历查看 / 用户信息 / 授权信息）落地时在这里声明。
 * 规范见 docs/web/04_数据层_约定.md。
 */
export const queryKeys = {}
