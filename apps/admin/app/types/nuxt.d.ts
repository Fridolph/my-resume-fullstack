import type { $Fetch } from 'ofetch'

declare module '#app' {
  interface NuxtApp {
    /** 统一请求层实例（由 packages/ui/app/plugins/api.ts 注入） */
    $api: $Fetch
  }
}

export {}
