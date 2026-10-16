import { z } from 'zod'

/**
 * 用户名/邮箱密码登录的输入契约，运行时校验与 LoginDto 类型由同一份 schema 定义。
 *
 * account 统一去首尾空格；Service 根据是否包含 `@` 选择 email 或 username 查询，
 * 邮箱和用户名最终都按小写匹配。
 * 密码不 trim；登录保留 4–64 字符以兼容已有 seed 密码，创号仍要求 6–20 字符。
 * strictObject 拒绝 email、username、accountType、roleKey 等多余字段；调用方只传 account。
 * 账号存在性和密码是否匹配由 Service 判断，不在 schema 中查询数据库。
 */
export const loginSchema = z.strictObject({
  account: z
    .string({ error: '用户名或邮箱必须是字符串' })
    .trim()
    .min(3, '用户名或邮箱至少 3 个字符')
    .max(64, '用户名或邮箱过长'),
  password: z.string({ error: '密码必须是字符串' }).min(6, '密码 6-20 位之间').max(20, '密码 6-20 位之间'),
})

/**
 * 校验后的登录输入；TypeScript 类型本身不承担运行时校验。
 */
export type LoginDto = z.infer<typeof loginSchema>
