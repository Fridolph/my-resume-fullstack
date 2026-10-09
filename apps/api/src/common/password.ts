import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { ScryptOptions } from 'node:crypto'

/**
 * 手写 Promise 包装而不是 `promisify(scrypt)`：
 * `promisify` 在重载函数上会挑到一个**只有 3 个参数**的签名，于是传 options 时类型不过
 * （运行时其实没问题 —— 这正是"类型错但代码对"的典型，不修就会被忽视）。
 */
function scryptAsync(password: string, salt: Buffer, keyLen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, options, (error, derivedKey) => {
      if (error) {
        reject(error)
      } else {
        resolve(derivedKey)
      }
    })
  })
}

/**
 * 密码哈希 —— 用 `node:crypto` 的 scrypt，**零依赖**。
 *
 * ## 为什么不能明文、也不能"可逆加密"
 *
 * 只要系统能算出原密码，泄露就只是时间问题（数据库被抓、备份外流、日志误打）。
 * 哈希是**单向**的：验证时把用户输入再做一次同样的变换，比对结果 —— 系统永远不知道密码本身。
 * 所以正确的设计里**不存在** `password` 字段，哪怕写着"已加密"。
 *
 * ## 三个参数各自防什么
 *
 * | 手段 | 防的什么 |
 * | ---- | -------- |
 * | **随机盐**（每个用户不同） | 彩虹表与"两个用户密码相同则哈希相同" |
 * | **慢**（scrypt 的 CPU + 内存成本） | 离线暴力破解：把单次尝试的成本抬到不划算 |
 * | **单向** | 拿到库也拿不到密码 |
 *
 * scrypt 相比 bcrypt 还**吃内存**，对 GPU/ASIC 破解更不友好；这也是它被选进标准库的原因。
 *
 * ## 存储格式：`scrypt$N$r$p$salt$hash`
 *
 * 把参数写进字符串（而不是全局常量）是关键：将来调强参数时，
 * **旧密码仍能用旧参数验证**，用户可以"下次登录时静默升级"，而不是被迫全体重置。
 *
 * ## 校验用 `timingSafeEqual`
 *
 * 普通字符串比较（`===`）在遇到第一个不同的字节时就返回，攻击者能通过响应时间的差异
 * 一个字节一个字节地把哈希猜出来。`timingSafeEqual` 的耗时与内容无关，堵掉这条侧信道。
 * —— 顺带一个坑：它在**长度不同**时也会抛错，所以要先比长度。
 */

/** scrypt 成本参数。N 越大越慢越安全；改动会让新哈希采用新参数，旧哈希仍可验证。 */
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLen: 64 } as const

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(plain, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  })

  return ['scrypt', SCRYPT_PARAMS.N, SCRYPT_PARAMS.r, SCRYPT_PARAMS.p, salt.toString('base64'), derived.toString('base64')].join('$')
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    // 格式不认识就当校验失败（不要抛错：调用方只关心"能不能登录"，
    // 格式异常属于数据问题，由日志/巡检暴露，不该变成 500 抛给登录的人）
    return false
  }

  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string]
  const expected = Buffer.from(hashB64, 'base64')

  const derived = await scryptAsync(plain, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })

  // 长度不同时 timingSafeEqual 会抛错，所以先比长度（长度本身不是秘密）
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}
