import type { $Fetch } from "ofetch";

declare module "#app" {
  interface NuxtApp {
    /** ofetch 请求实例（plugins/httpRequest.ts 注入） */
    $request: $Fetch;
  }
}

export {};
