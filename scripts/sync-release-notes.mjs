#!/usr/bin/env node
/**
 * 把 `CHANGELOG.md` 同步进 `packages/common/src/ui/release-notes.ts`。
 *
 * ## 为什么需要这个脚本
 *
 * Owner 2026-10-16 的约定：**每次发版除了生成 `CHANGELOG.md`，还要一并更新
 * `apps/admin/app/pages/release-notes.vue` 与 `help.vue`**。
 *
 * 直接让发版工具去改 `.vue` 源码是脆的（改样式即破坏解析）也是越界的（工具不该理解页面结构）。
 * 所以拆成两条职责：
 *
 * ```
 * @release-it/conventional-changelog ──▶ CHANGELOG.md
 *                                          │
 *                         本脚本（发版钩子）│
 *                                          ▼
 *                    packages/common/.../release-notes.ts  ──▶ admin 两个页面渲染它
 * ```
 *
 * 页面因此**永远不需要被脚本改写**，但呈现的内容会跟着发版自动更新。
 *
 * ## 用法
 *
 * ```
 * node scripts/sync-release-notes.mjs            # 写入数据文件
 * node scripts/sync-release-notes.mjs --check    # 只校验是否已同步（发版前用，非 0 退出表示过期）
 * ```
 *
 * `release-it` 的 `hooks.after:bump` 会调用它，所以正常情况下不需要手跑。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const changelogPath = `${root}CHANGELOG.md`
const targetPath = `${root}packages/common/src/ui/release-notes.ts`
const checkOnly = process.argv.includes('--check')

/** Conventional Commits 的类型 → 页面上的中文小标题。与 `.release-it.json` 的分组保持一致。 */
const SECTION_LABELS = {
  Features: '新功能',
  'Bug Fixes': '问题修复',
  Performance: '性能',
  Reverts: '回滚',
  Documentation: '文档',
  'Code Refactoring': '重构',
  Tests: '测试',
  'Build System': '构建',
  'Continuous Integration': '持续集成',
  Chores: '杂务',
}

/** 版本标题：取该版本里第一条 `feat` 的描述做主题（没有就用条目数兜底） */
function titleOf(version) {
  const firstFeature = version.sections.get('Features')?.[0]
  if (firstFeature) return firstFeature
  const total = [...version.sections.values()].reduce((sum, list) => sum + list.length, 0)
  return `${total} 项变更`
}

/**
 * 解析 CHANGELOG。
 *
 * 只认 `@release-it/conventional-changelog` 的标准形态：
 * `## [x.y.z](…) (date)` 或 `## x.y.z (date)`，下面是 `### Section` 与 `* 描述 (hash)`。
 * 解析不到的形态如实报错退出 —— **不要猜**，否则会把错内容写进页面。
 */
function parseChangelog(text) {
  const lines = text.split('\n')
  const releases = []
  let current = null
  let section = null

  for (const raw of lines) {
    const line = raw.trimEnd()

    const versionMatch = /^##\s+(?:\[([^\]]+)\]\([^)]*\)|([^\s(]+))(?:\s+\(([^)]+)\))?/.exec(line)
    if (versionMatch) {
      const version = versionMatch[1] ?? versionMatch[2]
      if (!version || /^unreleased$/i.test(version)) {
        current = null
        section = null
        continue
      }
      current = { version, date: versionMatch[3] ?? '', sections: new Map() }
      releases.push(current)
      section = null
      continue
    }

    if (!current) continue

    const sectionMatch = /^###\s+(.+)$/.exec(line)
    if (sectionMatch) {
      section = sectionMatch[1].trim()
      if (!current.sections.has(section)) current.sections.set(section, [])
      continue
    }

    const itemMatch = /^\*\s+(.+)$/.exec(line)
    if (itemMatch && section) {
      // 去掉尾部的 `(hash)` 或 `([hash](url))`
      const text = itemMatch[1].replace(/\s*\(\[?[0-9a-f]{7,}\]?(\([^)]*\))?\)\s*$/i, '').trim()
      if (text) current.sections.get(section).push(text)
    }
  }

  return releases
}

/** 生成数据文件的完整内容 */
function render(releases) {
  const body = releases
    .map(release => {
      const changes = [...release.sections.entries()].flatMap(([name, items]) => {
        const label = SECTION_LABELS[name] ?? name
        return items.map(item => `      ${JSON.stringify(`[${label}] ${item}`)},`)
      })
      return `  {
    version: ${JSON.stringify(release.version)},
    date: ${JSON.stringify(release.date)},
    title: ${JSON.stringify(titleOf(release))},
    changes: [
${changes.join('\n') || '      // 该版本没有可展示的条目'}
    ],
  },`
    })
    .join('\n')

  return `/**
 * 发版记录（**数据源**）。
 *
 * ⚠️ 本文件的 \`RESUME_RELEASES\` 由 \`scripts/sync-release-notes.mjs\` 从 \`CHANGELOG.md\` 生成，
 * **不要手改**（下次发版会覆盖）。要修正措辞，改 \`CHANGELOG.md\` 对应条目。
 *
 * 为什么数据在这里、而页面只渲染：见脚本头部的说明（发版工具不该改 .vue 源码）。
 */

/** 一条版本记录 */
export interface ResumeRelease {
  version: string
  date: string
  unreleased?: boolean
  title: string
  changes: string[]
}

/** 版本记录（新 → 旧），由发版脚本同步 */
export const RESUME_RELEASES: ResumeRelease[] = [
${body}
]
`
}

// ── 主流程 ──────────────────────────────────────────────

let changelog
try {
  changelog = readFileSync(changelogPath, 'utf8')
} catch {
  // 还没发过版（仓库里没有 CHANGELOG.md）：这在 `--check` 下不算失败 ——
  // 否则每个新克隆的仓库一跑检查就是红的，人会开始忽略这个检查。
  if (checkOnly) {
    console.log('[sync-release-notes] 尚无 CHANGELOG.md（未发过版），跳过检查 ✅')
    process.exit(0)
  }
  console.error(`[sync-release-notes] 读不到 ${changelogPath}。首次发版前请先让 release-it 生成它。`)
  process.exit(1)
}

let releases = parseChangelog(changelog)
if (releases.length === 0) {
  console.error('[sync-release-notes] 未能从 CHANGELOG.md 解析出任何版本 —— 不猜、直接失败。')
  console.error('  期望的形态：`## [0.4.0](...) (2026-10-16)` 或 `## 0.4.0 (2026-10-16)`，')
  console.error('  其下为 `### Features` 与 `* 描述 (hash)`。')
  process.exit(1)
}

// 未发布的变更（CHANGELOG 顶部的 `## [Unreleased]`）在上面的解析里被跳过，
// 但发布那一刻它已被 release-it 落成正式版本，所以这里不需要额外处理。
releases = releases.slice(0, 30)

const next = render(releases)

if (checkOnly) {
  let current = ''
  try {
    current = readFileSync(targetPath, 'utf8')
  } catch {
    console.error(`[sync-release-notes] 目标文件不存在：${targetPath}`)
    process.exit(1)
  }
  if (current !== next) {
    console.error('[sync-release-notes] release-notes 数据已过期，请运行：node scripts/sync-release-notes.mjs')
    process.exit(1)
  }
  console.log('[sync-release-notes] 已同步 ✅')
  process.exit(0)
}

writeFileSync(targetPath, next)
// 相对路径只用于展示，失败也不影响结果
try {
  execFileSync('git', ['add', 'packages/common/src/ui/release-notes.ts'], { cwd: root, stdio: 'ignore' })
} catch {
  // 不在 git 仓库或 git 不可用：文件已写好，让发版流程自己决定要不要提交
}
console.log(`[sync-release-notes] 已写入 ${releases.length} 个版本 → ${targetPath}`)
