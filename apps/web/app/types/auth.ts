/**
 * auth 接口的数据形状 —— **按真实后端返回对齐**（见 `docs/dev/02_身份与权限_设计.md` §2.3）。
 *
 * 参照的返回样例：`{ code, data: { token, refreshToken, oswUserInfo, oswCompanyInfo, permissionList }, msg, traceId }`
 *
 * ⚠️ 与本项目现有响应包装（`{ success, data, message, timestamp }`，见 `packages/common`）不同：
 * 本轮**只在 auth mock 层**采用后端形状，不动 `$api` 与 `packages/common` ——
 * 那两者是全局契约，改动会影响所有现有调用；等 P2 真接后端时再统一（记在文档「待统一」里）。
 */

/** 权限项（后端 `permissionList[]` 的一项） */
export interface AuthPermissionItem {
  id: number
  roleName: string
  roleCode: string
  color?: string
  type?: string
  dataPermission?: string
  /** 持有的权限键（后端命名：`域.资源:动作`） */
  permissionPermitKeys: string[]
  /**
   * 明确禁止的接口路径。
   *
   * 两种用法（Owner 2026-10-09 指出）：
   * - **隐藏入口**：路径在禁令里 → 连入口都不给（组件不渲染）；
   * - **能进但操作被拒**：入口照常，调用被禁接口时提示无权限。
   * 本轮只落地数据结构与查询函数，拦截逻辑随后续需求再加。
   */
  permissionForbidPaths?: string[]
  permissionNotYetOnlineKeys?: string[]
}

/** 用户信息（后端 `oswUserInfo`；字段以后端为准，这里只声明前端用到的，其余宽松承接） */
export interface AuthUserInfo {
  id: number
  companyId?: number
  email: string
  phone?: string
  /** 后端业务类型（如 `installer` / `admin`） */
  userType?: string
  firstName: string
  lastName: string
  avatar?: string
  language?: string
  status?: string
  [key: string]: unknown
}

/** 公司信息（后端 `oswCompanyInfo`） */
export interface AuthCompanyInfo {
  id: number
  companyName: string
  logo?: string
  [key: string]: unknown
}

/** 会话数据（后端 `data` 段） */
export interface AuthSessionData {
  token: string
  refreshToken?: string
  oswUserInfo: AuthUserInfo
  oswCompanyInfo?: AuthCompanyInfo
  permissionList: AuthPermissionItem[]
}

/** auth 接口的响应包装（后端形状） */
export interface AuthApiResponse {
  code: number
  data: AuthSessionData | null
  msg: string
  traceId?: string
}
