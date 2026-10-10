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

const nicknameSchema = z.string().trim().min(2, '昵称至少 2 个字符').max(32, '昵称最多 32 个字符')

const avatarSchema = z
  .string()
  .trim()
  .max(2048, '头像地址最多 2048 个字符')
  .pipe(z.url({ protocol: /^https?$/, error: '头像必须是 HTTP 或 HTTPS 地址' }))

/**
 * 超管创号的输入边界：username 与 email 至少提供一个，昵称仅用于展示。
 *
 * strictObject 拒绝 phone 及客户端指定的 id、passwordHash；
 * roleKey 限制为 admin/user，公开注册尚未开放，不能通过本接口创建超管。
 * 格式校验改善输入体验，username/email 唯一性仍由数据库约束保证。
 */
export const createUserSchema = z.strictObject({
  username: usernameSchema.optional(),
  nickname: nicknameSchema.optional(),
  password: z.string().min(6, '密码至少 6 个字符').max(20, '密码最多 20 个字符'),
  email: optionalEmailSchema,
  avatar: avatarSchema.optional(),
  roleKey: z.enum(['admin', 'user'], { error: '只能创建 admin 或 user' }).default('user'),
}).refine(input => input.username !== undefined || input.email !== undefined, {
  message: '用户名和邮箱至少填写一个',
  path: ['username'],
})

/**
 * 局部更新展示资料，不接受登录标识、角色或密码。
 *
 * optional 表示未传时保留原值，nullable 表示允许主动清空。
 * 不从创建 schema 整体 partial：避免把创号专用字段开放给修改接口。
 * 至少提供一个字段，空字符串仍须通过昵称或头像格式校验。
 */
export const updateUserSchema = z.strictObject({
  nickname: nicknameSchema.nullable().optional(),
  avatar: avatarSchema.nullable().optional(),
}).refine(updateUserDto => updateUserDto.nickname !== undefined || updateUserDto.avatar !== undefined, {
  message: '至少提供一个需要修改的字段',
  path: ['nickname'],
})

/**
 * 本人修改密码的输入边界；旧密码用于证明当前账号控制权，新密码用于生成新的哈希。
 *
 * 不接受 userId、sessionVersion 或角色字段；确认密码属于前端表单，不进入 API。
 */
export const changePasswordSchema = z.strictObject({
  oldPassword: z.string({ error: '旧密码必须是字符串' }).min(6, '旧密码至少 6 个字符').max(20, '旧密码最多 20 个字符'),
  newPassword: z.string({ error: '新密码必须是字符串' }).min(6, '新密码至少 6 个字符').max(20, '新密码最多 20 个字符'),
})

export type UsersDto = z.infer<typeof listUserSchema>
export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
