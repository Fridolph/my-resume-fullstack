<script setup lang="ts">
import ResumePublicShell from '#layers/public-resume/app/components/resume/ResumePublicShell.vue'
import { applyEmptyStatus } from '#layers/public-resume/app/composables/usePublicResume'
import { createShareApi } from '#layers/public-resume/app/apis/share'

/**
 * `/share/:token` —— **受控分享**链接的访客页面。
 *
 * ## 为什么复用 `ResumePublicShell` 而不是另写一套
 *
 * 访客看到的应该就是"公开站那一套"：同一份渲染、同一套主题与布局。
 * 内容差异由**接口返回的文档**决定（作者配置好的样子），页面不该自己再分叉。
 * 另写一套的后果是"分享页与公开页样式逐渐走偏"，那种分叉很难被发现。
 *
 * ## 与 `/resume/:id` 的三处区别
 *
 * 1. 数据源：`GET /api/share/:token`（token 换来授权），而不是 `/api/resume/public/:id`
 * 2. **`noindex`**：受控分享不该被搜索引擎收录
 * 3. 失效时显示**具体原因**（已过期 / 已撤销 / 未发布），而不是笼统的"不存在"
 */
const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))
const shareApi = createShareApi()

/** 失效原因的文案（只说明链接状态，不含简历内容 —— 所以分别提示不构成泄露） */
const FAILURE_MESSAGES: Record<string, string> = {
  'Share.Link:expired': '这条分享链接已过期，请向作者索取新的链接。',
  'Share.Link:revoked': '这条分享链接已被作者撤销。',
  'Share.Link:unpublished': '这份简历已不再公开。',
  'Share.Link:notFound': '分享链接不存在，请检查链接是否完整。',
}

/**
 * 取数结果是**判别联合**（成功 / 带着错误码的失败），而不是"抛异常 + 旁路 ref"：
 * SSR 阶段只在 `data` 里往返，旁路的 `ref` 不会被序列化到 payload，客户端会读到空值。
 */
const { data, status } = await useAsyncData(
  () => `share-link-${token.value}`,
  async () => {
    if (!token.value) {
      return { ok: false as const, code: 'Share.Link:notFound' }
    }
    try {
      return { ok: true as const, draft: await shareApi.read(token.value) }
    } catch (problem) {
      const code =
        (problem as { data?: { errorCode?: string } })?.data?.errorCode ??
        (problem as { errorCode?: string })?.errorCode ??
        'Share.Link:notFound'
      return { ok: false as const, code }
    }
  },
  { watch: [token] },
)

const failureCode = computed(() => (data.value && !data.value.ok ? data.value.code : null))
const document = computed(() => (data.value?.ok ? data.value.draft.document : null))
const hasDocument = computed(() => document.value !== null)

// 未取到文档 ⇒ 404（与公开页同一套口径：不存在的资源就该是 404，而不是 200 空态）
if (!hasDocument.value && status.value !== 'pending') {
  applyEmptyStatus('not-found')
}

/**
 * **访客信息记录的告知**（Owner 2026-10-19 定的口径）。
 *
 * ⚠️ 必须记住：这是**告知**，不是**同意** —— 没有同意门，`share.link.viewed`
 * 在页面加载时就已经写入了，采集是**全量**的。代码与文档都不能反过来宣称"已获访客同意"。
 *
 * 每次会话只弹一次（`sessionStorage`）：刷一次弹一次的结果是访客直接无视它。
 */
const NOTICE_KEY = 'share-visit-notice-shown'
const toast = useToast()

onMounted(() => {
  if (!hasDocument.value || sessionStorage.getItem(NOTICE_KEY)) {
    return
  }
  sessionStorage.setItem(NOTICE_KEY, '1')
  toast.add({
    title: '访问信息记录说明',
    description: '本页会记录访问的基础信息（IP、浏览器标识、浏览行为），仅用于学习与功能演示，不用于商业用途。',
    duration: 8000,
  })
})

// 受控分享一律不收录
useSeoMeta({
  title: () => (hasDocument.value ? '简历' : '分享链接不可用'),
  robots: 'noindex, nofollow',
})

const brandName = computed(
  () => document.value?.display.brand.title || document.value?.display.brand.logoText || '简历',
)
const pageTitle = computed(() => {
  const brand = brandName.value.trim()
  return brand && brand !== '简历' ? `${brand} · 简历` : '简历'
})
useSeoMeta({ title: () => pageTitle.value })
</script>

<template>
  <!-- 正常路径：与公开站**同一套**渲染 -->
  <ResumePublicShell
    v-if="hasDocument"
    :document="document"
    :resume-id="null"
    :empty-reason="null"
    :loading="status === 'pending'"
  />

  <!-- 失效路径：说清是哪种失效 —— 比统一"不存在"更友好，且不含简历内容 -->
  <main v-else class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
    <UIcon name="i-lucide-link-2-off" class="size-10 text-muted" />
    <h1 class="text-lg font-semibold text-highlighted">分享链接不可用</h1>
    <p class="text-sm text-muted">
      {{ failureCode ? (FAILURE_MESSAGES[failureCode] ?? '分享链接不可用。') : '正在加载…' }}
    </p>
    <UButton to="/" color="neutral" variant="subtle" label="回到首页" />
  </main>
</template>
