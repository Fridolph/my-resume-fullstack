<script setup lang="ts">
import ResumePublicShell from '#layers/public-resume/app/components/resume/ResumePublicShell.vue'
import { applyEmptyStatus } from '#layers/public-resume/app/composables/usePublicResume'

/**
 * `/` —— 公开简历首页。
 *
 * 展示作者标为「默认展示」（★）的那一份；**访客与作者看到的是同一页**。
 *
 * ## 为什么作者不再被 302 送走
 *
 * 早先的写法是"已登录作者 302 → 工作台"，理由是"他大概想接着改"。
 * Owner 2026-10-15 明确否掉了这个推断：`/` 就是**公开页**，作者也需要能看它
 *（那正是"访客看到的样子"），要改简历由页头身份菜单里的「我的简历」自己走进去。
 *
 * 所以这里不再做任何基于登录态的跳转：
 * - 访客：看默认简历；
 * - 作者：同样看这一页，页头身份菜单里有「我的简历」入口。
 *
 * 与 `/resume/:id`（看指定那一份）职责清晰分开：一个看默认，一个看指定。
 */
const { document, resumeId, status, emptyReason, isError, refresh } = usePublicResume('default')

// 同步可判的空态如实返回 404；异步空态的说明见 `applyEmptyStatus`
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
    :resume-id="resumeId"
    :empty-reason="emptyReason"
    :is-error="isError"
    :loading="status === 'pending'"
    @retry="refresh()"
  />
</template>
