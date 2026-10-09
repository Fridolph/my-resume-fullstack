import type { AuthApiResponse, AuthSessionData } from '~/types/auth'
import type { PermissionKey } from '~/config/permissions'
import { PERMISSIONS } from '~/config/permissions'

/**
 * auth 接口的 mock —— **形状对齐真实后端**：
 * `{ code, data: { token, refreshToken, oswUserInfo, oswCompanyInfo, permissionList }, msg, traceId }`
 *
 * 这样做的价值：P2 接真实接口时**只换数据来源**，会话层（`useAuthState`）、判断层（`usePermission`）
 * 与所有 UI 判断都不动。
 *
 * 三种身份：
 * - **游客**：不调接口（没有 token）→ 由 `ROLE_PERMISSIONS.guest` 兜底；
 * - **普通用户**：`user / user` → 部分权限键 + 接口禁令（演示"能进但操作被拒"）；
 * - **管理登录**：`admin / admin` → 全量权限键。
 *
 * ⚠️ 依旧不是鉴权：账号密码写在前端。真实实现在 P2 的后端 auth。
 */
export type MockAccount = 'admin' | 'user'

export const MOCK_ACCOUNT_HINT = '本地 mock 账号：admin / admin（管理）、user / user（普通用户）'

const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS)

interface MockAccountConfig {
  password: string
  roleName: string
  roleCode: string
  color: string
  userType: string
  firstName: string
  lastName: string
  email: string
  keys: PermissionKey[]
  /** 明确禁止的接口路径（接口级兜底，见 types/auth.ts 的两种用法） */
  forbidPaths: string[]
}

const ACCOUNTS: Record<MockAccount, MockAccountConfig> = {
  admin: {
    password: 'admin',
    roleName: 'Admin',
    roleCode: 'admin',
    color: '#1578D0',
    userType: 'admin',
    firstName: '飞雨',
    lastName: '厉',
    email: 'lifeiyu.mock@example.com',
    keys: ALL_PERMISSION_KEYS,
    // 管理员没有接口禁令
    forbidPaths: [],
  },
  user: {
    password: 'user',
    roleName: 'Member',
    roleCode: 'user',
    color: '#2F9E63',
    userType: 'member',
    firstName: '访客',
    lastName: '试用',
    email: 'guest.mock@example.com',
    keys: [
      PERMISSIONS.resumeView,
      PERMISSIONS.displayView,
      PERMISSIONS.displayEdit,
      PERMISSIONS.themeView,
      PERMISSIONS.themeEdit,
      // 第三档：能看到、也能点，但操作会被拒并提示（区别于游客的"整组 disabled"）
      PERMISSIONS.themeCustomView,
      PERMISSIONS.themeCustomInteract,
      PERMISSIONS.sectionsView,
      PERMISSIONS.sectionsInteract,
      PERMISSIONS.aiChatView,
      PERMISSIONS.aiChatCreate,
    ],
    // 演示"入口照常、操作被拒"：这些路径即使用户手写请求也会被后端拒
    forbidPaths: ['/resume/config/reset', '/resume/sections/delete'],
  },
}

export function isMockAccount(value: string): value is MockAccount {
  return value === 'admin' || value === 'user'
}

/** mock token（`token` 与账号一一对应，SSR 恢复时可由它反解出账号） */
export function mockToken(account: MockAccount) {
  return `mock-token-${account}`
}

export function accountFromToken(token: string | null | undefined): MockAccount | null {
  if (!token) {
    return null
  }

  const account = token.replace(/^mock-token-/, '')

  return isMockAccount(account) ? account : null
}

/** 校验账号密码；不通过返回 null（调用方据此提示"账号或密码不正确"） */
export function verifyMockAccount(username: string, password: string): MockAccount | null {
  const name = username.trim()

  if (!isMockAccount(name)) {
    return null
  }

  return ACCOUNTS[name].password === password ? name : null
}

/** 造一份与真实后端同形的登录响应 */
export function mockAuthResponse(account: MockAccount): AuthApiResponse {
  const config = ACCOUNTS[account]

  const data: AuthSessionData = {
    token: mockToken(account),
    refreshToken: `mock-refresh-${account}`,
    oswUserInfo: {
      id: account === 'admin' ? 1 : 2,
      companyId: 1,
      email: config.email,
      firstName: config.firstName,
      lastName: config.lastName,
      userType: config.userType,
      avatar: '',
      language: 'zh',
      status: 'active',
    },
    oswCompanyInfo: {
      id: 1,
      companyName: '示例科技（mock）',
      logo: '',
    },
    permissionList: [
      {
        id: account === 'admin' ? 1 : 2,
        roleName: config.roleName,
        roleCode: config.roleCode,
        color: config.color,
        type: config.roleCode,
        dataPermission: 'allProject',
        permissionPermitKeys: [...config.keys],
        permissionForbidPaths: [...config.forbidPaths],
        permissionNotYetOnlineKeys: [],
      },
    ],
  }

  // traceId 用固定值：不渲染到 DOM，但避免任何 SSR / 客户端差异
  return { code: 200, data, msg: '', traceId: 'mock-trace' }
}
