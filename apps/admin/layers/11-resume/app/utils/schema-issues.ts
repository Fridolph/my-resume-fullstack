/**
 * 把契约校验的 issues 转成一段可读文本（取前几条）。
 *
 * 创建页与编辑页都在**提交前自己跑一遍** `safeParse`：这样"半截条目 / 缺必填"
 * 这类必然被后端拒绝的输入，能在请求之前就用人话指出来，而不是只看到一句「请求参数有误」。
 *
 * `path` 用 `PropertyKey`（含 symbol）而不是 `string | number`：zod v4 的 issue path 就是这个类型，
 * 窄化会直接拒绝传入（TS2345）；symbol 段在展示时统一 `String()` 化。
 */
interface IssueLike {
  path: readonly PropertyKey[]
  message: string
}

export function describeContractIssues(issues: readonly IssueLike[]): string {
  const head = issues.slice(0, 3).map(issue => {
    const path = issue.path
      .map(part => String(part))
      .filter(part => part !== 'content' && part !== 'sections')
      .join('.')
    return path ? `${path}：${issue.message}` : issue.message
  })

  const more = issues.length > head.length ? `（另有 ${issues.length - head.length} 处）` : ''

  return `还有内容不符合契约：${head.join('；')}${more}`
}
