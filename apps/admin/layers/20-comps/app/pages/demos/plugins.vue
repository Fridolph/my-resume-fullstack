<script setup lang="ts">
import { normalizeApiError, resolveApiErrorMessage } from '@rs/common'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Plugins',
})

const nuxtApp = useNuxtApp()
const toast = useToast()

// 演示：监听 400 业务码（plugins/httpRequest.ts 会按 code / errorCode 触发 api:error 系列 hook）
// 注：hook 名称是动态业务码，NuxtApp 的 hook 类型未逐一声明，这里断言绕过
;(nuxtApp.hook as any)('api:error:400', (payload: any) => {
  toast.add({ title: 'api:error:400 hook', description: payload?.message, color: 'error' })
})

const apiBase = String(useRuntimeConfig().public.apiBase || '')

const loading = ref(false)
const result = ref('-')
const lastPath = ref('/health')

async function sendRequest() {
  loading.value = true
  result.value = 'requesting…'
  try {
    const res = await nuxtApp.$api(lastPath.value, { method: 'GET' })
    result.value = JSON.stringify(res, null, 2)
  } catch (e) {
    result.value = resolveApiErrorMessage(normalizeApiError(e))
    toast.add({ title: 'Request failed', description: resolveApiErrorMessage(normalizeApiError(e)), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="content-pad max-w-4xl space-y-6">
    <div class="space-y-2">
      <h1 class="text-xl font-semibold tracking-tight text-highlighted">app/plugins</h1>
      <p class="text-sm leading-6 text-muted">
        公共插件层：统一请求层
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">$api</code>（ofetch）按
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">packages/common</code> 的 success / data / message
        契约解包；上传走
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">原生 XHR + colada mutation</code>（fetch
        拿不到进度与取消）。
      </p>
    </div>

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      title="模板未接后端"
      description="请求会打到 runtimeConfig.public.apiBase，未起服务时请求会失败——正好演示统一错误处理与 api:error hook。"
    />

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">$api —— 统一请求层</p>
          <p class="text-sm text-muted">plugins/httpRequest.ts：ofetch 实例，自动挂鉴权头，统一响应解包 + 错误归一化</p>
        </div>
      </template>

      <div class="space-y-4">
        <div class="space-y-2">
          <UFormField label="请求路径" name="path">
            <UInput v-model="lastPath" class="w-full" />
          </UFormField>
          <div class="flex items-center gap-2">
            <UButton :loading="loading" icon="i-lucide-send" label="发送 GET" @click="sendRequest" />
            <span class="text-xs text-dimmed">baseURL = {{ apiBase }}</span>
          </div>
          <pre class="max-h-40 overflow-auto rounded-lg bg-elevated p-3 text-xs">{{ result }}</pre>
        </div>

        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">
const data = await nuxtApp.$api('/sketch/projects/detail', {
  method: 'GET',
  params: { projectId },
})</pre
        >
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">上传 —— 原生 XHR + colada mutation</p>
          <p class="text-sm text-muted">
            apis/files.ts 的 uploadFiles 负责 XHR（进度 + abort）；useFileUploader 用 colada mutation 管状态
          </p>
        </div>
      </template>

      <div class="space-y-2 text-sm text-muted">
        <p>
          用 XHR 而非 fetch，才能拿到 <code class="text-xs">upload.onprogress</code> 进度并配合
          <code class="text-xs">abort()</code>； 上传请求不可复用进行中的请求（否则进度会串）。
        </p>
        <p>
          实际用法见
          <ULink to="/comps/upload" class="text-primary hover:underline">组件库 · Upload</ULink>
          页（<code class="text-xs">useFileUploader</code> / <code class="text-xs">uploadFiles</code>）。
        </p>
        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">
import { uploadFiles } from '~/apis/files'
// 组件里更推荐 useFileUploader（校验 + 进度 + 取消），见 /comps/upload</pre
        >
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">错误 hook：<code class="text-xs">api:error:&lt;code&gt;</code></p>
          <p class="text-sm text-muted">
            请求层按状态码触发 hook（400/401/403/404/500/502/503/504/其它），全局或页面级都能监听
          </p>
        </div>
      </template>

      <div class="space-y-2 text-sm text-muted">
        <p>本页已注册 <code class="text-xs">api:error:400</code>：命中时会弹 toast。</p>
        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">
useNuxtApp().hook('api:error:400', payload =&gt; toast.add({ description: payload.message }))</pre
        >
        <p class="text-xs text-dimmed">
          生产项目通常在 <code>app.vue</code> / layout 里注册一次全局处理（如 401 跳登录）。
        </p>
      </div>
    </UCard>
  </div>
</template>
