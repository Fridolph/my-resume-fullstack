/**
 * admin 侧会话数据形状 —— **直接对齐后端返回**，不做旧客户端形状的映射。
 *
 * 来源见 `apps/server/src/auth/auth.service.ts`：
 * - `POST /auth/login` → `{ token, userId, email, nickname, roleKeys, permissionKeys }`
 * - `GET /auth/info`   → 同上去掉 token
 *
 * ⚠️ 与 web 的 `apps/web/app/types/auth.ts` **形状不同**：那边沿用旧客户端的
 * `oswUserInfo` / `permissionList[].permissionPermitKeys` 结构。本仓两端 auth 尚未统一，
 * 统一会同时改动已验收的 web 登录链路，留待专门的迁移卡（见 `dao/tasks/DAO-031`）。
 */

/** 经鉴权后的当前身份（后端 identity 段） */
export interface BackendIdentity {
  /** 用户主键（cuid 文本，非自增整数） */
  userId: string
  email: string | null
  nickname: string | null
  /** 当前数据库认可的角色键，如 `admin` / `super_admin` */
  roleKeys: string[]
  /** 当前数据库认可的权限键，命名 `域.资源:动作` */
  permissionKeys: string[]
}

/** 登录响应：身份 + 访问令牌 */
export interface LoginResult extends BackendIdentity {
  token: string
}

/** 后台用户区展示用的派生字段 */
export interface SessionUser {
  name: string
  email: string
  initials: string
}
