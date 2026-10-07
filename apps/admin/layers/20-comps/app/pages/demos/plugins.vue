<script setup lang="ts">
import { getApiErrorMessage, getApiHostMap, resolveHostType } from '~/utils/requestContext'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Plugins',
})

const nuxtApp = useNuxtApp()
const toast = useToast()

// 演示：监听 400 业务码（plugins/httpRequest.ts 会通过 applyApiErrorHooks 触发）
// 注：hook 名称是动态业务码，NuxtApp 的 hook 类型未逐一声明，这里断言绕过
;(nuxtApp.hook as any)('api:error:400', (payload: any) => {
  toast.add({ title: 'api:error:400 hook', description: payload?.msg, color: 'error' })
})

const hostMap = getApiHostMap()
const hostRows = computed(() => Object.entries(hostMap).map(([k, v]) => ({ key: k, value: v })))

const loading = ref(false)
const result = ref('-')
const lastPath = ref('/health')

async function sendRequest() {
  loading.value = true
  result.value = 'requesting…'
  try {
    const res = await nuxtApp.$request(lastPath.value, { method: 'GET' })
    result.value = JSON.stringify(res, null, 2)
  }
  catch (e) {
    result.value = getApiErrorMessage(e)
    toast.add({ title: 'Request failed', description: getApiErrorMessage(e), color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="content-pad max-w-4xl space-y-6">
    <div class="space-y-2">
      <h1 class="text-xl font-semibold tracking-tight text-highlighted">
        app/plugins
      </h1>
      <p class="text-sm leading-6 text-muted">
        迁移自 greensketch <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">app/plugins</code> 的公共插件：统一请求层
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">$request</code>（ofetch）与上传专用
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">$alova</code>（Alova + XHR）。两者共用
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">utils/requestContext</code>（host 路由 / 公共头 / 错误解包）。
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
          <p class="font-semibold">
            $request —— 统一请求层
          </p>
          <p class="text-sm text-muted">
            plugins/httpRequest.ts：ofetch 实例，自动挂分区 host + 公共头，业务码 { code, msg, data } 统一解包
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <p class="mb-2 text-xs font-medium text-dimmed">
            host 映射（getApiHostMap）
          </p>
          <div class="divide-y divide-default rounded-lg border border-default text-sm">
            <div v-for="row in hostRows" :key="row.key" class="flex items-center justify-between gap-4 px-3 py-2">
              <code class="text-xs">{{ row.key }}</code>
              <span class="truncate text-muted">{{ row.value || '（未配置）' }}</span>
            </div>
          </div>
          <p class="mt-2 text-xs text-dimmed">
            按路径选区：<code>resolveHostType('/greenet/...')</code> → {{ resolveHostType({ path: '/greenet/x' }) }}；
            其余 → {{ resolveHostType({ path: '/foo' }) }}
          </p>
        </div>

        <div class="space-y-2">
          <UFormField label="请求路径" name="path">
            <UInput v-model="lastPath" class="w-full" />
          </UFormField>
          <div class="flex items-center gap-2">
            <UButton :loading="loading" icon="i-lucide-send" label="发送 GET" @click="sendRequest" />
            <span class="text-xs text-dimmed">baseURL = {{ hostMap.base || '（未配置）' }}</span>
          </div>
          <pre class="max-h-40 overflow-auto rounded-lg bg-elevated p-3 text-xs">{{ result }}</pre>
        </div>

        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">const data = await nuxtApp.$request('/sketch/projects/detail', {
  method: 'GET',
  params: { projectId },
})</pre>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">
            $alova —— 上传专用
          </p>
          <p class="text-sm text-muted">
            plugins/alova.ts：XHR 适配器（可拿进度 + abort），与 $request 共用 requestContext
          </p>
        </div>
      </template>

      <div class="space-y-2 text-sm text-muted">
        <p>
          用 XHR 而非 fetch，才能拿到 <code class="text-xs">onUpload</code> 进度并配合 <code class="text-xs">abort()</code>；
          上传请求不可复用进行中的请求。
        </p>
        <p>
          实际用法见 <ULink to="/comps/upload" class="text-primary hover:underline">组件库 · Upload</ULink>
          页（<code class="text-xs">useFileUploader</code> / <code class="text-xs">uploadFiles</code>）。
        </p>
        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">const alova = nuxtApp.$alova
// 业务里推荐用 apis/files.ts 的 uploadFiles / createUploadMethod</pre>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">
            错误 hook：<code class="text-xs">api:error:&lt;code&gt;</code>
          </p>
          <p class="text-sm text-muted">
            请求层按业务码触发 hook（400/401/403/500/502/503/504/其它），全局或页面级都能监听
          </p>
        </div>
      </template>

      <div class="space-y-2 text-sm text-muted">
        <p>本页已注册 <code class="text-xs">api:error:400</code>：命中时会弹 toast。</p>
        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">useNuxtApp().hook('api:error:400', payload =&gt; toast.add({ description: payload.msg }))</pre>
        <p class="text-xs text-dimmed">
          生产项目通常在 <code>app.vue</code> / layout 里注册一次全局处理（如 401 跳登录）。
        </p>
      </div>
    </UCard>
  </div>
</template>
