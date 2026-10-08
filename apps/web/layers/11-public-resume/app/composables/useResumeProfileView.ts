import type { ResumeContent, ResumeDisplayOptions } from '#layers/public-resume/app/types/resume'

/**
 * hero 三档实现共用的资料视图。
 *
 * 三档都要「头像文字 / 是否有头像图 / 标语（最多 2 条）/ 按开关过滤后的联系方式」，
 * 抽在这里避免三份重复（约定：同一逻辑出现三处以上才抽）。
 */
export function useResumeProfileView(props: {
  content: ResumeContent
  options: ResumeDisplayOptions
}) {
  const profile = computed(() => props.content.profile)

  const avatarText = computed(() => profile.value.avatarText || profile.value.name.slice(0, 1))

  /** 有正面图才走图片路径；否则回退文本块（编辑者不填图也不会塌） */
  const hasAvatarImage = computed(() => Boolean(profile.value.hero.frontImageUrl))

  /** 与旧站一致：最多展示 2 条标语 */
  const slogans = computed(() => profile.value.hero.slogans.slice(0, 2))

  const visibleContact = computed(() =>
    profile.value.contact.filter((item) => {
      if (item.key === 'phone') return props.options.showPhone
      if (item.key === 'email') return props.options.showEmail
      if (item.key === 'location') return props.options.showLocation
      if (item.key === 'years') return props.options.showYears
      return true
    }),
  )

  return { profile, avatarText, hasAvatarImage, slogans, visibleContact }
}
