/**
 * 判断当前是否"窄屏"（移动端）。
 *
 * 为什么不用 `@vueuse/core` 的 `useMediaQuery`：共享 layer 应该**零运行时依赖**
 * （依赖越少，越不会和宿主的版本打架）。这里只需要一个断点判断，几行足够。
 *
 * SSR 约定：
 * - 服务端与客户端**首次渲染**都返回 `false`（按桌面处理）→ 不会水合不一致
 * - 浮层面板只在 `open` 为真时才渲染，所以真实断点在"挂载后"才生效也没问题
 */
export function useNarrowScreen(query: () => string) {
  const isNarrow = ref(false)
  let mql: MediaQueryList | null = null

  function update() {
    if (mql) {
      isNarrow.value = mql.matches
    }
  }

  function bind() {
    if (!import.meta.client) {
      return
    }
    mql?.removeEventListener('change', update)
    mql = window.matchMedia(query())
    update()
    mql.addEventListener('change', update)
  }

  onMounted(bind)
  onBeforeUnmount(() => mql?.removeEventListener('change', update))
  // 断点本身可能来自 props（如 AppModal 的 breakpoint）
  watch(query, bind)

  return isNarrow
}
