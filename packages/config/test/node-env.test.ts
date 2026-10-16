import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { readGitCommit, readPackageVersion } from '../src/node-env.js'

/**
 * `src/node-env.ts` 的单元测试。
 *
 * 这组测试保护的是**降级行为**，而不是"能读到值"这件显然的事：这两个函数在
 * `nuxt.config.ts` 求值期间执行，一个未捕获的异常会让整个应用起不来。
 * 所以真正要钉住的是：**在无 git、无 package.json、JSON 损坏、取值非法这四类环境下，
 * 必须安静地返回 `'unknown'`，而不是抛。**
 *
 * 会让它变红的改动：把 `try/catch` 去掉；把兜底值从 `'unknown'` 改成空串或抛错；
 * 放宽 `readGitCommit` 的引用白名单（那会重新打开"以 `-` 开头被 git 当选项解析"的口子）。
 */

const tempDirs: string[] = []

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rs-config-test-'))
  tempDirs.push(dir)
  return dir
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

describe('readPackageVersion', () => {
  it('读到合法 package.json 时返回版本号', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.2.3' }))
    expect(readPackageVersion(dir)).toBe('1.2.3')
  })

  it('缺少 package.json 时降级为 unknown，不抛', () => {
    expect(readPackageVersion(makeTempDir())).toBe('unknown')
  })

  it('JSON 损坏时降级为 unknown，不抛', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'package.json'), '{ not json')
    expect(readPackageVersion(dir)).toBe('unknown')
  })

  it('有 package.json 但没有 version 字段时降级为 unknown', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x' }))
    expect(readPackageVersion(dir)).toBe('unknown')
  })

  it('version 不是字符串时降级为 unknown', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: 42 }))
    expect(readPackageVersion(dir)).toBe('unknown')
  })
})

describe('readGitCommit', () => {
  it('在没有 git 的目录里降级为 unknown，不抛', () => {
    expect(readGitCommit(makeTempDir())).toBe('unknown')
  })

  it('拒绝会被 git 当作选项解析的引用（白名单）', () => {
    // 这些取值若进入 git 的参数位，语义会从"引用"变成"开关"，必须以白名单挡掉
    expect(readGitCommit(makeTempDir(), '--upload-pack=/bin/sh')).toBe('unknown')
    expect(readGitCommit(makeTempDir(), '-c')).toBe('unknown')
    expect(readGitCommit(makeTempDir(), 'HEAD; rm -rf /')).toBe('unknown')
    expect(readGitCommit(makeTempDir(), '   ')).toBe('unknown')
  })

  it('在当前仓库里能读到真正的短提交号', () => {
    // cwd 用本包目录：它一定在一个 git 工作树内（worktree 也算）
    const sha = readGitCommit(process.cwd())
    expect(sha).toMatch(/^[0-9a-f]{7,}$/)
  })
})
