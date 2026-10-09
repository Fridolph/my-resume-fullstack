<script setup lang="ts">
import { Alignment, Fit, Layout } from '@rive-app/webgl2'
import type { StateMachineInput } from '~/composables/useStateMachineInput'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Nuxt Rive card',
})

/**
 * Rive 卡片完整示例 —— 「太阳能系统如何在一天里工作」。
 *
 * ## 这个 demo 演示什么
 *
 * 1. **Rive 的状态机模型**：`.riv` 不是"一段动画"，而是**状态机 + 输入**。
 *    改输入的值，状态机自己决定呈现哪个状态 —— 这张图没有三套素材，是一套素材三种形态。
 * 2. **完整交互**：三个时段按钮（当前项高亮 + 5 秒进度条）、自动轮播、电池开关、国家标注。
 * 3. **Nuxt 接入方式**：`.client` 组件 + `<ClientOnly>` + 等高占位（见 `app/components/NuxtRive.client.vue`）。
 *
 * ## ⚠️ 一个很容易踩的坑：输入的取值范围
 *
 * `Time Period` 输入接受 **0 / 1 / 2**，分别对应 **morning / afternoon / night** ——
 * 不是直觉上的 1/2/3。写错会让"第一个状态永远出不来"（0 被漏掉），
 * 而现象看起来像"某个选项坏了"，很容易去怀疑资源缺内容。
 * 遇到这类问题，**先 dump `.riv` 里真实的输入定义与取值**，别靠猜。
 */
const RIVE_SRC = '/rives/how_the_system_works.riv'
const STATE_MACHINE = 'State Machine'

/**
 * 三个时段 —— `value` 是写进 Rive 的**输入值**（0/1/2），`label` 是界面文案。
 * 顺序与原项目一致：morning → afternoon → night。
 */
const TIME_PERIODS = [
  { value: 0, key: 'morning', label: 'Morning' },
  { value: 1, key: 'afternoon', label: 'Afternoon' },
  { value: 2, key: 'night', label: 'Night' },
] as const

/** 自动轮播间隔（原项目是 5 秒） */
const AUTO_PLAY_MS = 5000

const loaded = ref(false)
const loadError = ref('')

const withBattery = ref(true)
/** 初值与 `.riv` 的默认一致（该资源默认是 afternoon = 1），避免"打开即某状态、再点它看不出变化" */
const timePeriod = ref<number>(1)
const country = ref(0)
const autoPlay = ref(true)

let batteryInput: StateMachineInput | null = null
let timePeriodInput: StateMachineInput | null = null
let countryInput: StateMachineInput | null = null

const INPUT_NAMES = {
  withBattery: 'With Battery',
  timePeriod: 'Time Period',
  country: 'Country',
} as const

const riveParams = {
  src: RIVE_SRC,
  autoplay: true,
  layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  isAnimationStateMachine: true,
  stateMachine: STATE_MACHINE,
}

const options = {
  fitCanvasToArtboardHeight: false,
  useOffscreenRenderer: true,
}

/** 当前时段的文案（用于高亮与进度条的状态展示） */
const currentPeriod = computed(() => TIME_PERIODS.find(item => item.value === timePeriod.value) ?? TIME_PERIODS[1])

function onRiveLoaded(instance: unknown) {
  loaded.value = true

  batteryInput = useStateMachineInput(instance as never, STATE_MACHINE, INPUT_NAMES.withBattery)
  timePeriodInput = useStateMachineInput(instance as never, STATE_MACHINE, INPUT_NAMES.timePeriod)
  countryInput = useStateMachineInput(instance as never, STATE_MACHINE, INPUT_NAMES.country)

  if (!batteryInput && !timePeriodInput && !countryInput) {
    loadError.value = `已加载，但没取到状态机输入（${STATE_MACHINE} 下的 ${Object.values(INPUT_NAMES).join(' / ')}）—— 多半是这个 .riv 与示例不匹配`
    return
  }

  applyInputs()
  scheduleNext()
}

/** 把界面上的值写回 Rive 输入 */
function applyInputs() {
  if (batteryInput) {
    batteryInput.value = withBattery.value
  }
  if (timePeriodInput) {
    timePeriodInput.value = timePeriod.value
  }
  if (countryInput) {
    countryInput.value = country.value
  }
}

// ── 自动轮播：照原项目的行为 —— 每 5 秒切下一个，手动点击后重新计时 ──
let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function scheduleNext() {
  clearTimer()
  if (!autoPlay.value) {
    return
  }
  timer = setTimeout(() => {
    // 0 → 1 → 2 → 0 循环（这就是"三个状态都看得到"的保证）
    timePeriod.value = (timePeriod.value + 1) % TIME_PERIODS.length
    applyInputs()
    scheduleNext()
  }, AUTO_PLAY_MS)
}

/** 手动选时段：切换 + 重新计时（否则刚点完就自动跳走） */
function selectTimePeriod(value: number) {
  timePeriod.value = value
  applyInputs()
  scheduleNext()
}

function toggleAutoPlay() {
  autoPlay.value = !autoPlay.value
  scheduleNext()
}

onBeforeUnmount(clearTimer)

const countryOptions = [
  { value: 0, label: '无标注' },
  { value: 1, label: 'EN' },
  { value: 2, label: 'NL' },
  { value: 3, label: 'DE' },
]

function setCountry(value: number) {
  country.value = value
  applyInputs()
}
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Nuxt Rive card（Rive 完整交互示例）</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
      Rive 的 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">.riv</code> 不是"一段动画"，而是
      <strong>状态机 + 输入</strong>：改输入的<strong>值</strong>，状态机自己决定呈现哪个状态。
      下面这张太阳能系统图只有<strong>一套素材</strong>，但
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">Time Period</code> 输入取
      <strong>0 / 1 / 2</strong>（morning / afternoon / night）就呈现三种形态。
    </p>

    <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section class="rounded-lg border border-default bg-default p-4">
        <!-- 时段切换：当前项高亮 + 进度条表示"离自动切换还有多久" -->
        <div class="flex gap-1 rounded-full border border-default bg-elevated/40 p-1">
          <button
            v-for="period in TIME_PERIODS"
            :key="period.key"
            type="button"
            class="relative flex-1 cursor-pointer overflow-hidden rounded-full px-3 py-2 text-sm transition-colors"
            :class="
              timePeriod === period.value
                ? 'bg-default font-semibold text-highlighted shadow-sm'
                : 'text-muted hover:text-highlighted'
            "
            :aria-pressed="timePeriod === period.value"
            @click="selectTimePeriod(period.value)"
          >
            <span class="relative z-10">{{ period.label }}</span>
            <!-- 进度条：与原项目一样用"从左到右铺满"表示这 5 秒 -->
            <span
              v-if="timePeriod === period.value && autoPlay"
              class="absolute inset-y-0 left-0 -z-0 bg-primary/20"
              :style="{ animation: `rive-progress ${AUTO_PLAY_MS}ms linear forwards` }"
            />
          </button>
        </div>

        <div class="relative mt-3 w-full overflow-hidden rounded-md" style="aspect-ratio: 1232 / 590">
          <ClientOnly>
            <NuxtRive
              id="demo-rive"
              class="absolute inset-0"
              :rive-params="riveParams"
              :options="options"
              @rive-is-loaded="onRiveLoaded"
            />
            <template #fallback>
              <div class="grid h-full w-full place-items-center bg-elevated/40 text-sm text-muted">
                Rive 动画在浏览器中渲染…
              </div>
            </template>
          </ClientOnly>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p v-if="loadError" class="text-xs" style="color: var(--ui-error, #dc2626)">{{ loadError }}</p>
          <p v-else-if="loaded" class="text-xs text-muted">
            已加载 <code>{{ RIVE_SRC }}</code> · 当前：{{ currentPeriod.label }}（Time Period = {{ timePeriod }}）
          </p>
          <p v-else class="text-xs text-muted">加载中…</p>

          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            :icon="autoPlay ? 'i-lucide-pause' : 'i-lucide-play'"
            :label="autoPlay ? '暂停轮播' : '继续轮播'"
            @click="toggleAutoPlay"
          />
        </div>
      </section>

      <section class="space-y-5 rounded-lg border border-default bg-default p-4">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">状态机输入</h2>
          <p class="mt-1 text-xs leading-5 text-muted">
            界面控件 → 写回 Rive 输入 → 状态机切换。取不到输入时
            <code class="rounded bg-elevated px-1 py-0.5 text-[0.6875rem]">useStateMachineInput()</code>
            返回 <code class="rounded bg-elevated px-1 py-0.5 text-[0.6875rem]">null</code>，界面不崩。
          </p>
        </div>

        <label class="flex items-center justify-between gap-3 text-sm">
          <span class="text-muted"><code class="text-xs">With Battery</code>（boolean）</span>
          <USwitch v-model="withBattery" size="xs" aria-label="With Battery" @update:model-value="applyInputs" />
        </label>

        <div class="space-y-2">
          <span class="text-sm text-muted">
            <code class="text-xs">Time Period</code>（number）<span class="text-xs">· 0/1/2</span>
          </span>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="period in TIME_PERIODS"
              :key="period.key"
              size="xs"
              :color="timePeriod === period.value ? 'primary' : 'neutral'"
              :variant="timePeriod === period.value ? 'solid' : 'outline'"
              :label="`${period.value} · ${period.label}`"
              @click="selectTimePeriod(period.value)"
            />
          </div>
        </div>

        <div class="space-y-2">
          <span class="text-sm text-muted"><code class="text-xs">Country</code>（number）</span>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="item in countryOptions"
              :key="item.value"
              size="xs"
              :color="country === item.value ? 'primary' : 'neutral'"
              :variant="country === item.value ? 'solid' : 'outline'"
              :label="item.label"
              @click="setCountry(item.value)"
            />
          </div>
        </div>

        <div class="border-t border-default pt-4">
          <h3 class="text-xs font-semibold text-highlighted">⚠️ 输入取值范围（易错点）</h3>
          <p class="mt-2 text-xs leading-5 text-muted">
            <code>Time Period</code> 接受 <strong>0 / 1 / 2</strong>（morning / afternoon / night），
            <strong>不是</strong> 1/2/3。写成 1/2/3 会让 <code>0</code> 那个状态永远出不来 ——
            现象像"某个选项坏了"，其实是值错位。遇到这类问题先 dump 资源里的输入定义，别猜。
          </p>
        </div>

        <div class="border-t border-default pt-4">
          <h3 class="text-xs font-semibold text-highlighted">⚠️ 弃用提示（Rive 2.4x 起）</h3>
          <p class="mt-2 text-xs leading-5 text-muted">
            控制台会有几条 deprecation：<strong>状态机输入</strong>（<code>stateMachineInputs</code>）、 运行时订阅
            <code>state-change</code> / <code>loop</code> 事件都在被取代 —— 官方方向是
            <strong>data binding（view model）</strong>。示例仍用输入模型（存量 <code>.riv</code> 多是如此）。
          </p>
        </div>

        <div class="border-t border-default pt-4">
          <h3 class="text-xs font-semibold text-highlighted">接入要点</h3>
          <ul class="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">
            <li><code>.riv</code> 放 <code>public/rives/</code>，按 URL 引用（不走打包）</li>
            <li>
              <code>&lt;NuxtRive&gt;</code> 是 <code>.client</code> 组件，外层配 <code>&lt;ClientOnly&gt;</code> +
              等高占位
            </li>
            <li>在 <code>@rive-is-loaded</code> 里取输入，之后改 <code>input.value</code></li>
            <li>自动轮播用 <code>setTimeout</code> 递归，手动点击后要**重置计时**，否则刚点完就被切走</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 进度条：与原项目一样，"从左到右铺满"表示离自动切换的剩余时间 */
@keyframes rive-progress {
  from {
    width: 0%;
  }

  to {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 减弱动态时不播进度条动画（自动轮播本身仍可用，只是没有进度提示） */
  :deep([style*='rive-progress']) {
    animation: none !important;
  }
}
</style>
