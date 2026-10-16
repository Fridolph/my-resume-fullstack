<script setup lang="ts">
import ResumePublicShell from '#layers/public-resume/app/components/resume/ResumePublicShell.vue'
import { applyEmptyStatus } from '#layers/public-resume/app/composables/usePublicResume'

/**
 * `/resume/:id` —— 公开（只读）查看**指定**简历。
 *
 * 用途：作者需要看"访客眼里的样子"时走这里；分享某一份简历给他人也走这里。
 * 访客无需登录。
 *
 * ⚠️ 与本页**并存**的另一条路径是作者工作台 `/my-resumes/draft/:id`（可编辑、需登录）。
 * 两者刻意分开：一个 URL 只表达一件事，避免"同一地址对作者可编辑、对访客只读"
 * 那种要靠身份推断语义的设计。
 *
 * ⚠️ 作者侧路由已整体迁到 `/my-resumes`（列表）与 `/my-resumes/draft/:id`（工作台），
 * 所以 `resume/` 目录下现在**只有本页**，不存在与 `draft` 抢匹配的问题。
 */
const route = useRoute()
const resumeId = computed(() => Number(route.params.id))

// 非数字 id（例如被分享时截断的链接）→ 直接给"不存在"的空态，不必打一次必然 400 的请求
const valid = computed(() => Number.isInteger(resumeId.value) && resumeId.value > 0)

// ⚠️ 别名：本页已有 `resumeId`（来自路由参数），composable 返回的那个必须改名，否则互相遮蔽
const {
  document,
  resumeId: publishedResumeId,
  status,
  emptyReason,
  isError,
  refresh,
} = usePublicResume(() => (valid.value ? resumeId.value : null))

// 同步可判的空态（例如非法 id）如实返回 404；异步空态的说明见 `applyEmptyStatus`
applyEmptyStatus(emptyReason.value)

const brandName = computed(
  () => document.value?.display.brand.title || document.value?.display.brand.logoText || '简历',
)

/** 标题：有品牌名就用「品牌 · 简历」，没有就只写「简历」（避免拼出"简历 · 简历"） */
const pageTitle = computed(() => {
  const brand = brandName.value.trim()
  return brand && brand !== '简历' ? `${brand} · 简历` : '简历'
})

useSeoMeta({
  title: () => pageTitle.value,
  description: () => document.value?.display.brand.description || '在线简历',
})
</script>

<template>
  <ResumePublicShell
    :document="document"
    :resume-id="publishedResumeId"
    :empty-reason="emptyReason"
    :is-error="isError"
    :loading="status === 'pending'"
    @retry="refresh()"
  />
</template>
