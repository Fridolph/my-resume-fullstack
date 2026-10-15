/** 将数组按每页条数切分，用于 PDF 明细自动分页 */
export function chunkByPage<T>(items: T[], perPage: number): T[][] {
  if (items.length === 0) {
    return []
  }
  if (perPage <= 0) {
    return [items]
  }

  const pages: T[][] = []
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage))
  }
  return pages
}
