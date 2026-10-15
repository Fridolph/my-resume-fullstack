/**
 * 文件上传的**纯前端换算**（与具体接口无关）。
 *
 * 判据：能脱离业务与框架运行 —— 这里只有"数字除法 + 取整"，谁的上传流程都能用。
 *
 * 从 `apps/admin/app/apis/files.ts` 收上来（DAO-035）。**刻意没收的东西**：
 * - `toUploadFormData`（FormData 组装）：字段名 `files` 是与后端的约定，偏业务；
 * - `unwrapUploadResponse`（响应解包）与 `UploadedFile`：形状取决于"上传端点返回什么"，
 *   而那个端点还没做（见 DAO-036），等契约定了再收，避免先收一版马上改。
 */

/** 上传进度；`percent` 为 0–100 的整数 */
export interface FileUploadProgress {
  loaded: number
  total: number
  percent: number
}

/**
 * 把已传字节数换算成进度百分比。
 *
 * `total` 为 0（浏览器拿不到总长）时按 0% 处理，而不是除零得到 `NaN`/`Infinity` ——
 * 进度条拿到 `NaN` 会直接渲染成空，比停在 0% 更难排查。
 */
export function toFileUploadProgress(loaded: number, total: number): FileUploadProgress {
  const safeTotal = total > 0 ? total : 0
  const percent = safeTotal > 0 ? Math.min(100, Math.round((loaded / safeTotal) * 100)) : 0

  return { loaded, total: safeTotal, percent }
}
