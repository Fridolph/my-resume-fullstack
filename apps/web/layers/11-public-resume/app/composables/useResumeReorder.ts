import type Sortable from 'sortablejs'

export function useResumeReorder<Item extends { id: string }>(items: () => Item[], update: (items: Item[]) => void) {
  const container = ref<HTMLElement | null>(null)
  const handleClass = `resume-handle-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  let instance: Sortable | undefined
  let disposed = false
  onMounted(async () => {
    const SortableConstructor = (await import('sortablejs')).default
    if (!container.value || disposed) return
    instance = SortableConstructor.create(container.value, {
      handle: `.${handleClass}`,
      draggable: '[data-order-id]',
      forceFallback: true,
      animation: 150,
      onEnd(event) {
        if (event.oldIndex === undefined || event.newIndex === undefined || event.oldIndex === event.newIndex) return
        event.item.remove()
        event.from.insertBefore(event.item, event.from.children[event.oldIndex] ?? null)
        const reordered = [...items()]
        const [item] = reordered.splice(event.oldIndex, 1)
        if (!item) return
        reordered.splice(event.newIndex, 0, item)
        update(reordered)
      },
    })
  })
  onBeforeUnmount(() => {
    disposed = true
    instance?.destroy()
  })
  return { container, handleClass }
}
