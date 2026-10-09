/**
 * 语言（**轻量预留**，不引 `@nuxtjs/i18n`）。
 *
 * 现在它只持有一个 locale 值（cookie 持久化 → SSR 可读、首屏即正确），不做任何文案映射。
 * 这样做的理由：真要做国际化时，把这里换成 `@nuxtjs/i18n` 的 `useI18n()` 即可，
 * **调用方一律用 `useLocale()`**，不需要改；而现在引入整套 i18n 只是给页面加负担。
 */
export type Locale = 'zh' | 'en'

const LOCALE_COOKIE = 'my-resume.locale'
const DEFAULT_LOCALE: Locale = 'zh'

export function useLocale() {
  const locale = useState<Locale>('app-locale', () => DEFAULT_LOCALE)

  const localeCookie = useCookie<Locale>(LOCALE_COOKIE, {
    default: () => DEFAULT_LOCALE,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  /** 把 cookie 同步进共享状态（plugin 启动时调用，幂等） */
  function hydrate() {
    locale.value = localeCookie.value ?? DEFAULT_LOCALE
  }

  function setLocale(next: Locale) {
    locale.value = next
    localeCookie.value = next
  }

  return { locale, setLocale, hydrate }
}
