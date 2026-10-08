import type { ResumeSectionKey } from "#layers/public-resume/app/types/resume";

/**
 * 当前正在阅读的区块（用于把模块名显示到页面头部）。
 *
 * 只观察传入的 keys（正文栏的区块），用 `IntersectionObserver` 判断谁落在
 * 「头部下方 ~ 视口上半」这个带内，取 keys 顺序里最先命中的那个作为当前区块。
 *
 * 状态用 `useState`，所以页面头部与容器读到的是同一份，不必层层透传。
 */
export function useResumeActiveSection() {
  const activeKey = useState<ResumeSectionKey | null>("resume-active-section", () => null);

  let observer: IntersectionObserver | null = null;
  const visible = new Set<ResumeSectionKey>();

  function stop() {
    observer?.disconnect();
    observer = null;
    visible.clear();
  }

  function observe(root: HTMLElement | null, keys: ResumeSectionKey[]) {
    stop();
    if (!import.meta.client || !root || !keys.length) {
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.sectionKey as
            | ResumeSectionKey
            | undefined;
          if (!key) {
            continue;
          }
          if (entry.isIntersecting) {
            visible.add(key);
          } else {
            visible.delete(key);
          }
        }

        const first = keys.find((key) => visible.has(key));
        if (first) {
          activeKey.value = first;
        }
      },
      // 顶部留出头部高度，底部只认视口上半，避免"下一个区块刚露头就抢焦点"
      { rootMargin: "-72px 0px -55% 0px" },
    );

    for (const key of keys) {
      const el = root.querySelector(`[data-section-key="${key}"]`);
      if (el) {
        observer.observe(el);
      }
    }
  }

  /** 回到顶部 / 离开编辑态时清空，让头部恢复品牌区 */
  function reset() {
    stop();
    activeKey.value = null;
  }

  return { activeKey, observe, stop, reset };
}
