<script setup lang="ts">
import { createApiErrorBody } from '@rs/common'
import type { NormalizedApiError } from '@rs/common'
import {
  API_ERROR_POLICY,
  NETWORK_ERROR_CODE,
  normalizeApiError,
  resolveApiErrorDetail,
  resolveApiErrorMessage,
  resolveApiErrorPolicy,
} from '@rs/common'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Request / 错误处理',
})

/**
 * 请求错误处理的**演练场**（配合 `docs/web/05_请求错误处理_设计.md`）。
 *
 * 三组演示：
 * - **真实请求**：全局 `$fetch` 打通（成功）/ 打不通（真实 404 或网络错误）/ `{ silent: true }` 跳过默认处理；
 * - **mock 场景**：本地造后端失败体 → 演示归一化、文案映射与策略（不发请求，不依赖后端）；
 * - **策略表**：当前 `API_ERROR_POLICY` 一览（**公共错误默认自动处理**；400 / 409 留给调用方）。
 *
 * 顶部记录**最近触发的 hook**，用来验证"每次失败都会触发"这件事。
 */
const nuxtApp = useNuxtApp()

const hookLog = ref<{ name: string; code: number; errorCode?: string }[]>([])

for (const name of [
  'api:error',
  'api:error:400',
  'api:error:401',
  'api:error:403',
  'api:error:404',
  'api:error:500',
  `api:error:${NETWORK_ERROR_CODE}`,
]) {
  ;(nuxtApp.hook as any)(name, (err: unknown) => {
    const normalized = normalizeApiError(err)
    hookLog.value = [{ name, code: normalized.code, errorCode: normalized.errorCode }, ...hookLog.value].slice(0, 8)
  })
}

const busy = ref(false)
const headline = ref('点上面的按钮试试')
const detail = ref('')
const lastError = ref<NormalizedApiError | null>(null)

function reportError(err: unknown) {
  const error = normalizeApiError(err)
  const policy = resolveApiErrorPolicy(error)

  lastError.value = error
  headline.value = resolveApiErrorMessage(error)
  detail.value = `${resolveApiErrorDetail(error)}｜策略 notify=${policy.notify} · action=${policy.action}`
}

/** 真实请求 · 成功 */
async function runSuccess() {
  busy.value = true
  try {
    const data = await nuxtApp.$api<{ status: string; service: string }>('/health')
    lastError.value = null
    headline.value = '成功'
    detail.value = JSON.stringify(data)
  } catch (err) {
    reportError(err)
  } finally {
    busy.value = false
  }
}

/**
 * 真实请求 · 失败：打一个不存在的路径。
 * 后端在跑 → 真实 404（走完整 plugin 链路）；后端没跑 → 网络错误（code 0）。
 */
async function runRealFailure(options: { silent?: boolean } = {}) {
  busy.value = true
  try {
    await nuxtApp.$api('/__demos_request_not_found__', options.silent ? { silent: true } : {})
    headline.value = '竟然成功了？'
    detail.value = '这个路径本该不存在'
  } catch (err) {
    reportError(err)
    detail.value = `${detail.value}${options.silent ? '｜silent：本次请求不应触发任何 hook' : ''}`
  } finally {
    busy.value = false
  }
}

/** mock · 本地造后端失败体（不经过请求层，所以不会触发 hook） */
function runMock(scenario: { code: number; errorCode?: string; mockMessage?: string }) {
  if (scenario.code === NETWORK_ERROR_CODE) {
    reportError(new Error('mock: 网络中断'))
    return
  }

  const body = createApiErrorBody({
    code: scenario.code,
    message: scenario.mockMessage ?? `mock ${scenario.code}`,
    errorCode: scenario.errorCode,
    traceId: `mock-trace-${scenario.code}`,
    path: '/demos/request',
  })

  reportError({ data: body, statusCode: scenario.code })
}

const mockScenarios = [
  { label: '400 参数错误', code: 400, mockMessage: 'Validation failed: name is required' },
  { label: '401 未登录', code: 401, errorCode: 'AUTH.Token:expired' },
  { label: '403 无权限', code: 403 },
  { label: '404 不存在', code: 404 },
  { label: '409 冲突', code: 409, mockMessage: 'Name already taken' },
  { label: '500 服务端错误', code: 500 },
  { label: '网络中断', code: NETWORK_ERROR_CODE },
]

const policyRows = computed(() =>
  Object.entries(API_ERROR_POLICY).map(([code, policy]) => ({ code, notify: policy.notify, action: policy.action })),
)
</script>

<template>
  <div class="content-pad space-y-6">
    <section>
      <h1 class="text-xl font-semibold tracking-tight text-highlighted">Request / 错误处理</h1>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
        请求层只有<strong>一处</strong>（<code>packages/ui/app/plugins/api.ts</code>）—— 它注入 <code>$api</code> （Nuxt
        官方的 provide 机制），<strong>所有 <code>apis/*.ts</code> 都走它</strong>：注入鉴权头、解包
        <code>data</code>、<strong>公共错误默认自动处理</strong>（401 → 清 token + 引导登录；403 / 404 / 5xx / 网络中断
        → 统一提示，带 traceId）。按接口跳过：<code>$api(url, { silent: true })</code>。 设计见
        <code>docs/web/05_请求错误处理_设计.md</code>。
      </p>
    </section>

    <!-- 结果面板 -->
    <!-- 结果面板：加 id 便于验证脚本稳定定位 -->
    <section id="request-result" class="rounded-lg border border-default bg-default p-4">
      <p class="text-sm font-medium text-highlighted">{{ headline }}</p>
      <p v-if="detail" class="mt-1 break-all font-mono text-xs text-muted">{{ detail }}</p>
    </section>

    <div class="grid gap-4 lg:grid-cols-3">
      <!-- 真实请求 -->
      <UCard :ui="{ body: 'p-4 sm:p-4' }">
        <p class="font-medium text-highlighted">真实请求（走完整链路）</p>
        <p class="mt-1 text-xs text-muted">
          <code>/health</code> 需要后端在跑；失败按钮打的是不存在的路径（后端在跑 → 真实 404，没跑 → 网络错误）。
          <br />注意：失败时右下角<strong>会自动弹出提示</strong>（silent 那次不会）。
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton size="xs" label="成功" icon="i-lucide-check" :loading="busy" @click="runSuccess" />
          <UButton
            size="xs"
            color="error"
            variant="outline"
            label="失败"
            icon="i-lucide-x"
            :loading="busy"
            @click="runRealFailure({})"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            label="失败（silent）"
            icon="i-lucide-bell-off"
            :loading="busy"
            @click="runRealFailure({ silent: true })"
          />
        </div>
      </UCard>

      <!-- mock 场景 -->
      <UCard :ui="{ body: 'p-4 sm:p-4' }">
        <p class="font-medium text-highlighted">mock 场景（不依赖后端）</p>
        <p class="mt-1 text-xs text-muted">
          本地造后端失败体 → 演示归一化字段与文案映射（<code>errorCode</code> 优先于 <code>code</code>）。
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            v-for="item in mockScenarios"
            :key="item.label"
            size="xs"
            color="neutral"
            variant="outline"
            :label="item.label"
            @click="runMock(item)"
          />
        </div>
      </UCard>

      <!-- hook 日志 -->
      <UCard :ui="{ body: 'p-4 sm:p-4' }">
        <p class="font-medium text-highlighted">触发的 hook（最近 8 条）</p>
        <p class="mt-1 text-xs text-muted">
          默认静默 = 没有监听者就没有提示；<code>silent</code> 的请求连 hook 都不触发。
        </p>
        <p v-if="!hookLog.length" class="mt-3 text-xs text-dimmed">（还没触发过）</p>
        <ul v-else id="hook-log" class="mt-3 space-y-1">
          <li v-for="(item, index) in hookLog" :key="`${item.name}-${index}`" class="font-mono text-xs text-muted">
            {{ item.name }} · code={{ item.code }}<span v-if="item.errorCode"> · {{ item.errorCode }}</span>
          </li>
        </ul>
      </UCard>
    </div>

    <!-- 策略表 -->
    <UCard :ui="{ body: 'p-4 sm:p-4' }">
      <p class="font-medium text-highlighted">策略表 <code class="text-xs">API_ERROR_POLICY</code></p>
      <p class="mt-1 text-xs text-muted">
        默认全静默。接后端 auth 后建议把 <strong>401</strong> 改成 <code>notify: true</code> +
        <code>action: 'redirect-login'</code>（不改的话用户会一直停在失败页面）。
      </p>
      <div class="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="row in policyRows" :key="row.code" class="flex items-center gap-2 font-mono text-xs text-muted">
          <UBadge color="neutral" variant="subtle" size="sm" :label="row.code === '0' ? 'network(0)' : row.code" />
          <span>notify={{ row.notify }}</span>
          <span>action={{ row.action }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
