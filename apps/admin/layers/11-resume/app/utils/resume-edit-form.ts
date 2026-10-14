import type { ResumeDate, ResumeDocument } from '@rs/common'

/**
 * 编辑页在"就地编辑文档"之外的少量辅助逻辑。
 *
 * 核心原则：**编辑页改的是文档对象本身**（`MySchemaForm` 直接写 `section.data` 的字段），
 * 所以不需要"编辑态 ⇄ 契约"的双向转换，没出现在表单里的字段会自然原样保留。
 * 这里只处理两件表单表达不了的事：给新增条目补 id、把日期渲染成只读摘要。
 */

/**
 * 给文档里**缺 id 或 id 重复**的元素补上新 id（就地修改传入对象）。
 *
 * 为什么需要它：表单里"新增一项"用的是静态的 `blank` 模板，克隆出来的 id 是空串 ——
 * 如果让模板自带 id，每次新增的都是同一个 id，契约的「文档内 ID 唯一」当场就会拒绝。
 * 所以把"生成 id"这一步收敛到提交前统一做，既保证唯一，也不让字段表承担随机性。
 *
 * 只在元素**本来就有 `id` 字段**时才补：`footer` 这类没有 id 的对象不该被塞一个。
 */
export function assignMissingIds(document: ResumeDocument): ResumeDocument {
  const seen = new Set<string>()

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') {
      return
    }

    const record = node as Record<string, unknown>
    if ('id' in record) {
      const id = record.id
      if (typeof id !== 'string' || id === '' || seen.has(id)) {
        record.id = globalThis.crypto.randomUUID()
      }
      seen.add(record.id as string)
    }

    Object.values(record).forEach(walk)
  }

  walk(document)
  return document
}

/**
 * 日期的只读摘要。
 *
 * 编辑页**不提供日期编辑**（字段类型表达不了那个判别联合，见 `config/resume-edit-schemas.ts`），
 * 但完全不显示时间会让人以为内容丢了 —— 所以统一渲染成人能读的一行。
 */
export function formatResumeDate(date: ResumeDate | undefined): string {
  if (!date) {
    return '未填写'
  }

  if (date.mode === 'custom') {
    return date.text.trim() === '' ? '未填写' : date.text
  }

  const end = date.isCurrent ? '至今' : (date.end ?? '')
  return end ? `${date.start} ~ ${end}` : date.start
}
