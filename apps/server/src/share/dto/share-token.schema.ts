import { z } from 'zod'

/**
 * 分享 token 的形状校验。
 *
 * `base64url` 的 24 字节随机串 = 32 个字符。这里**只校验形状**（长度与字符集），
 * 存在性仍要查库 —— 形状校验早一步挡掉明显的垃圾请求，省一次数据库往返。
 */
export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/)
