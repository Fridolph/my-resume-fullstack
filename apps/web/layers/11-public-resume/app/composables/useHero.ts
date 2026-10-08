import type { ResumeContent, ResumeDisplayOptions } from '#layers/public-resume/app/types/resume'

/**
 * hero 的数据视图与派生 —— 三档实现和 `hero/parts/*` 零件共用的**唯一数据入口**。
 *
 * 一层职责：把 `content` / `options` 变成各零件直接可用的数据，
 * 于是零件自己 `useHero(props)` 就能拿到所需，不必从薄壳层层透传 props。
 *
 * 原 `useResumeProfileView`（只有三档实现用它）在这里升级为统一入口：
 * 把 pro 用到的 `stats` / `gallery` / `availability` 也收进来，
 * 否则零件会各自去 `props.content.profile.xxx ?? []` 重复一遍容错。
 */
export function useHero(props: { content: ResumeContent; options: ResumeDisplayOptions }) {
  const profile = computed(() => props.content.profile)

  const avatarText = computed(() => profile.value.avatarText || profile.value.name.slice(0, 1))

  /** 有正面图才走图片路径；否则回退文本块（编辑者不填图也不会塌） */
  const hasAvatarImage = computed(() => Boolean(profile.value.hero.frontImageUrl))

  /** 与旧站一致：最多展示 2 条标语 */
  const slogans = computed(() => profile.value.hero.slogans.slice(0, 2))

  const visibleContact = computed(() =>
    profile.value.contact.filter(item => {
      if (item.key === 'phone') return props.options.showPhone
      if (item.key === 'email') return props.options.showEmail
      if (item.key === 'location') return props.options.showLocation
      if (item.key === 'years') return props.options.showYears
      return true
    }),
  )

  // pro 引入的可选字段：旧内容 / 旧 localStorage 里没有，统一在 `?? []` 容错
  const stats = computed(() => profile.value.stats ?? [])
  const gallery = computed(() => profile.value.gallery ?? [])
  const availability = computed(() => profile.value.availability ?? '')

  const links = computed(() => profile.value.links)
  const interests = computed(() => profile.value.interests)

  return {
    profile,
    avatarText,
    hasAvatarImage,
    slogans,
    visibleContact,
    stats,
    gallery,
    availability,
    links,
    interests,
  }
}
