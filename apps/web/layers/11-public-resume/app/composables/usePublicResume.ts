import { normalizeApiError, type ResumeDocument, type ResumeDraftResponse } from '@rs/common'
import { createPublicResumeApi } from '#layers/public-resume/app/apis/resume-public'

/**
 * 公开简历页的数据源（访客视角，无需登录）。
 *
 * `source` 决定读哪一份：
 * - `default`：作者标为「默认展示」的那一份 —— 首页 `/` 用它；
 * - 数字：按 id 读指定简历 —— `/resume/:id` 用它。
 *
 * ## 为什么把「找不到」收成正常返回值，而不是让异常冒出去
 *
 * ⚠️ 这是 SSR 取数的一个真实陷阱，实测踩到过：
 * `useAsyncData` 在**服务端**会把 `$api` 抛出的错误包成 `NuxtError`（`statusCode: 500`），
 * **把原本的 `code` / `errorCode` 丢掉**，再序列化给客户端。于是客户端拿到的
 * `error.value` 已经无法区分「404 这份不存在」与「500 服务故障」——
 * `normalizeApiError` 只能把它判成网络错误，页面就会把"预期内的空态"显示成"故障"。
 *
 * 解法是在**服务端当场定下结局**：把 404 捕获成 `kind: 'empty'` 正常返回（可序列化），
 * 只有真正的故障才让异常继续冒（那时也确实该按故障处理）。
 *
 * ## 顺带用 `setResponseStatus`
 *
 * 找不到时把 HTTP 状态设成 404 —— 否则"已删除的简历"会长期以 200 被搜索引擎收录。
 */
type PublicResumeOutcome =
  | { kind: 'ok'; data: ResumeDraftResponse }
  | { kind: 'empty'; reason: 'no-default' | 'not-found' }
  | { kind: 'error' }

/**
 * 把"没有可展示内容"如实反映为 HTTP 404。
 *
 * ⚠️ 这是一个**必须由页面显式调用**的副作用，不能塞进 composable 的 `watch`：
 * 实测（Nuxt 4.5）在 `await useAsyncData()` 之后，composable 内部注册的 watch 在**服务端
 * 不会被触发**（日志里只看到客户端那次），于是 `setResponseStatus` 从未在 SSR 阶段执行，
 * 状态码一直是 200。而**同一句调用写在页面 setup 里就生效**（实测 200 → 404）。
 *
 * 所以约定：页面 `await usePublicResume(...)` 之后立刻调用 `applyEmptyStatus(emptyReason.value)`。
 * 客户端是 no-op，只有 SSR 那趟有意义 —— 否则"已删除的简历"会长期以 200 被收录。
 */
export function applyEmptyStatus(reason: 'no-default' | 'not-found' | null) {
  if (reason) setResponseStatus(404)
}

export function usePublicResume(source: MaybeRefOrGetter<'default' | number | null>) {
  const api = createPublicResumeApi()

  const key = computed(() => {
    const value = toValue(source)
    if (value === 'default') return 'public-resume:default'
    // 无效 id（非正整数）不复用任何缓存键：它根本不发请求
    return value && value > 0 ? `public-resume:${value}` : 'public-resume:invalid'
  })

  const { data, status, refresh } = useAsyncData<PublicResumeOutcome>(
    key,
    async () => {
      const value = toValue(source)
      // 无效 id（例如被截断的分享链接）直接给"不存在"，不必打一次必然 400 的请求
      if (value !== 'default' && (!value || value <= 0)) {
        return { kind: 'empty', reason: 'not-found' }
      }
      try {
        const response = value === 'default' ? await api.findDefault() : await api.findById(value as number)
        return { kind: 'ok', data: response }
      } catch (problem) {
        const normalized = normalizeApiError(problem)
        if (normalized.code === 404) {
          // 预期内状态：不抛异常，让客户端拿到确定的语义
          return { kind: 'empty', reason: value === 'default' ? 'no-default' : 'not-found' }
        }
        // 真实故障：交给 useAsyncData 记为 error（客户端也只能看到"故障"这一档）
        throw problem
      }
    },
    { watch: [key] },
  )

  /** 契约文档（响应里的 `document`），页面渲染直接用这一份 */
  const document = computed<ResumeDocument | null>(() => (data.value?.kind === 'ok' ? data.value.data.document : null))

  /** 空态原因（"没有可展示的内容"，例如作者还没设默认） */
  const emptyReason = computed<'no-default' | 'not-found' | null>(() =>
    data.value?.kind === 'empty' ? data.value.reason : null,
  )

  const isError = computed(() => status.value === 'error')

  /** 这份简历的 id（就地编辑保存时要用）。在内部收窄联合，调用方不必判断 `kind`。 */
  const resumeId = computed(() => (data.value?.kind === 'ok' ? data.value.data.resume.id : null))

  return { data, document, resumeId, status, emptyReason, isError, refresh }
}
