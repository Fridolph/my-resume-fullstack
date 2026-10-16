/**
 * 当前正在阅读的区块（用于把模块名显示到页面头部）。
 *
 * 只观察传入的 id（正文栏的区块），用 `IntersectionObserver` 判断谁落在
 * 「头部下方 ~ 视口上半」这个带内，取 keys 顺序里最先命中的那个作为当前区块。
 *
 * 状态用 `useState`，所以页面头部与容器读到的是同一份，不必层层透传。
 */
export function useResumeActiveSection() {
  // 记的是 **section id**（不是区块 key）：自定义模块多实例，只有 id 能区分；
  // 页面头部拿到 id 后再用文档清单查出要显示的名字
  const activeId = useState<string | null>('resume-active-section', () => null)

  let observer: IntersectionObserver | null = null
  const visible = new Set<string>()

  function stop() {
    observer?.disconnect()
    observer = null
    visible.clear()
  }

  function observe(root: HTMLElement | null, ids: string[]) {
    stop()
    if (!import.meta.client || !root || !ids.length) {
      return
    }

    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.sectionId
          if (!id) {
            continue
          }
          if (entry.isIntersecting) {
            visible.add(id)
          } else {
            visible.delete(id)
          }
        }

        const first = ids.find(id => visible.has(id))
        if (first) {
          activeId.value = first
        }
      },
      // 顶部留出头部高度，底部只认视口上半，避免"下一个区块刚露头就抢焦点"
      { rootMargin: '-72px 0px -55% 0px' },
    )

    for (const id of ids) {
      const el = root.querySelector(`[data-section-id="${id}"]`)
      if (el) {
        observer.observe(el)
      }
    }
  }

  /** 回到顶部 / 离开编辑态时清空，让头部恢复品牌区 */
  function reset() {
    stop()
    activeId.value = null
  }

  return { activeId, observe, stop, reset }
}
