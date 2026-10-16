import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'
import { AUDIT_ACTIONS } from '@rs/common'

/**
 * 动作覆盖率：**动作字典里的每个动作，都要么已接线、要么在待接线清单里。**
 *
 * ## 为什么需要这条测试
 *
 * 审计最容易出的问题不是"写错了"，而是"**忘了写**" —— 新增一个删除接口时
 * 没人提醒你要加审计，等到真要追责时才发现那个动作从来没记录过，
 * 而那时**历史数据已经永久丢失**（快照补不回来）。
 *
 * 这条测试把"忘"变成"红"：往 `AUDIT_ACTIONS` 加一个动作却没有接线，
 * 就必须显式把它写进下面的 `PENDING` 清单 —— **从"忘了"变成"有意识地欠着"**。
 */
const PENDING = new Set([
  // 账号与权限域尚未接线（按 AGENTS.md「一卡一闭环」，留作独立 Issue）
  'userCreate',
  'userDelete',
  'roleChange',
])

// ⚠️ 不用 `import.meta.url`：本包 tsconfig 是 `module: commonjs`，用它会报 TS1343。
// vitest 的工作目录就是包根（apps/server），所以 `process.cwd()` 是稳的。
const SRC_ROOT = join(process.cwd(), 'src')

/** 收集 `src/` 下的**非测试**源码（测试里出现动作名不算接线） */
function collectSourceFiles(): string[] {
  return readdirSync(SRC_ROOT, { recursive: true, encoding: 'utf8' })
    .filter(name => name.endsWith('.ts'))
    .filter(name => !name.includes('__tests__'))
}

const sourceText = collectSourceFiles()
  .map(name => readFileSync(join(SRC_ROOT, name), 'utf8'))
  .join('\n')

test('每个审计动作要么已接线，要么在待接线清单里', () => {
  const unwired: string[] = []

  for (const key of Object.keys(AUDIT_ACTIONS)) {
    if (sourceText.includes(`AUDIT_ACTIONS.${key}`)) continue
    if (PENDING.has(key)) continue
    unwired.push(key)
  }

  assert.deepEqual(
    unwired,
    [],
    `这些动作既没接线、也不在 PENDING 里：${unwired.join(', ')}\n` +
      '  要么在业务代码里调用它（推荐用 AuditService 的语义化方法），要么显式加入 PENDING 清单。',
  )
})

test('待接线清单只减不增：接线后必须从 PENDING 移除', () => {
  const alreadyWired = [...PENDING].filter(key => sourceText.includes(`AUDIT_ACTIONS.${key}`))

  assert.deepEqual(
    alreadyWired,
    [],
    `这些动作已经接线，但仍留在 PENDING 里：${alreadyWired.join(', ')} —— 请从清单中移除，否则清单会失去意义。`,
  )
})
