import assert from 'node:assert/strict'
import { test } from 'vitest'
import { ALL_PERMISSION_KEYS } from '../permission-keys'
import { findMissingPermissionKeys } from '../permission-sync'

/**
 * 这条测试守的是一个**真实踩过的坑**（2026-10-17）：
 * 代码里加了 `Audit.Log:view`，库里的 `permissions` 表没同步 ——
 * 于是 `super_admin` 缺这项权限，超管打开审计页被 403。
 *
 * 症状与"权限逻辑写错了"完全一样，所以必须有启动自检把数据问题**与代码缺陷区分开**。
 */
test('库里的键齐全 → 不报缺失', () => {
  assert.deepEqual(findMissingPermissionKeys(ALL_PERMISSION_KEYS), [])
})

test('库里少一个键 → 精确报出是哪个（而不是笼统的"权限不同步"）', () => {
  const missing = findMissingPermissionKeys(ALL_PERMISSION_KEYS.filter(key => key !== 'Audit.Log:view'))
  assert.deepEqual(missing, ['Audit.Log:view'])
})

test('库比代码多（旧键没清理）不算缺失 —— 那是另一种问题，不该在这里误报', () => {
  assert.deepEqual(findMissingPermissionKeys([...ALL_PERMISSION_KEYS, 'Legacy.Key:view']), [])
})

test('空库（从未 seed）→ 全部报缺失，顺序与代码定义一致', () => {
  assert.deepEqual(findMissingPermissionKeys([]), [...ALL_PERMISSION_KEYS])
})
