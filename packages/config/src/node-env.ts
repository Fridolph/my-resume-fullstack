import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 读取仓库 HEAD 的短提交号，用于把「线上跑的是哪个提交」写进运行时配置。
 *
 * 为什么必须带兜底而不是直接抛：本函数会在 `nuxt.config.ts` 求值时执行，
 * 而那一刻**任何异常都会让整个应用起不来**。真实会遇到的情况包括
 * CI 的 shallow clone（无 `.git`）、导出的 tarball、以及把源码拷进镜像的场景 ——
 * 这些环境里「拿不到提交号」是正常状态，不该升级成启动失败。
 *
 * 用 `execFileSync` 而非 `execSync`：不经过 shell，提交号即使来自环境变量
 * （例如 CI 注入的 `AWS_COMMIT_ID`）也不构成命令注入面；再用白名单挡住
 * 以 `-` 开头、会被 git 当成选项解析的取值。
 *
 * @param cwd 执行 git 的工作目录；调用方传应用根目录。
 * @param ref 目标引用，默认 `HEAD`。
 * @returns 短提交号；不可得时返回 `'unknown'`（调用方据此判断，不必再做空值分支）。
 */
export function readGitCommit(cwd: string, ref = 'HEAD'): string {
  const target = ref.trim()
  // 只允许引用里合法出现的字符；空值或含 `-`/空格等一律视为不可用
  if (!/^[A-Za-z0-9._/-]+$/.test(target)) return 'unknown'
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', target], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return sha || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * 读取某个目录下 `package.json` 的 `version`，用于运行时配置里的版本号。
 *
 * 与 {@link readGitCommit} 同样的理由需要兜底：文件缺失或 JSON 损坏时
 * 应降级为 `'unknown'`，而不是让 `nuxt.config.ts` 求值失败。
 *
 * @param dir 目录绝对路径（例如应用根目录）。
 * @returns 版本字符串；不可得时返回 `'unknown'`。
 */
export function readPackageVersion(dir: string): string {
  try {
    const parsed = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version?: unknown }
    const { version } = parsed
    return typeof version === 'string' && version.length > 0 ? version : 'unknown'
  } catch {
    return 'unknown'
  }
}
