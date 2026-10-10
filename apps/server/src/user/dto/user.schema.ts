import { z } from 'zod'

/**
 * 用户输入校验与 DTO 类型；类型由 schema 推导。
 */

export const listUserSchema = z.strictObject({
  // TODO: page、pageSize、search 的默认值与上限。
})

export const userIdSchema = z.string().trim().min(1, '用户 ID 不能为空')

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, '用户名至少 3 个字符')
  .max(32, '用户名最多 32 个字符')
  .regex(/^[\p{Script=Han}A-Za-z0-9_]+$/u, '用户名只能包含中文、字母、数字和下划线')

const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(64, '邮箱最多 64 个字符')
  .pipe(z.email({ error: '邮箱格式不正确' }))
  .optional()

/**
 * 超管创号的输入边界：username 与 email 至少提供一个，昵称仅用于展示。
 *
 * strictObject 拒绝 phone 及客户端指定的 id、passwordHash；
 * roleKey 限制为 admin/user，公开注册尚未开放，不能通过本接口创建超管。
 * 格式校验改善输入体验，username/email 唯一性仍由数据库约束保证。
 */
export const createUserSchema = z.strictObject({
  username: usernameSchema.optional(),
  nickname: z.string().trim().min(2, '昵称至少 2 个字符').max(32, '昵称最多 32 个字符').optional(),
  password: z.string().min(6, '密码至少 6 个字符').max(20, '密码最多 20 个字符'),
  email: optionalEmailSchema,
  avatar: z
    .string()
    .trim()
    .max(2048, '头像地址最多 2048 个字符')
    .pipe(z.url({ protocol: /^https?$/, error: '头像必须是 HTTP 或 HTTPS 地址' }))
    .optional(),
  roleKey: z.enum(['admin', 'user'], { error: '只能创建 admin 或 user' }).default('user'),
}).refine(input => input.username !== undefined || input.email !== undefined, {
  message: '用户名和邮箱至少填写一个',
  path: ['username'],
})

export const updateUserSchema = z.strictObject({
  // TODO: PATCH 字段全部 optional；确认是否允许修改角色与密码。
})

export type UsersDto = z.infer<typeof listUserSchema>
export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
