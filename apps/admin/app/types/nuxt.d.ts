import type { $Fetch } from 'ofetch'

declare module '#app' {
  interface NuxtApp {
    /** ofetch 请求实例（plugins/httpRequest.ts 注入） */
    $request: $Fetch
    /** Alova 上传实例（plugins/alova.ts 注入） */
    $alova: any
  }
}

export {}
