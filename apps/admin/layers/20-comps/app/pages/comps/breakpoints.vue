<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'

definePageMeta({
  layout: 'has-sidebar',
  title: 'Breakpoints',
})

/**
 * 断点对照页 —— 用来**实测** `app/assets/css/main.css` 里那 9 档断点。
 *
 * 为什么要有这一页：Tailwind 是**按需生成**的，没人用 `note:` 这类变体时，编译产物里
 * 根本不会出现那几行 `@media (min-width: 1366px)`。所以"配置写对了"**不能靠看产物证明**，
 * 得有个真实用到它的地方。这一页就是那个地方，同时也是日常调布局时的尺子。
 *
 * 断点方案来自参考项目 `早期项目`，重点补的是 Tailwind 默认缺失的
 * **1366 → 1600** 区间（笔记本布局的深水区）。
 */
/** 与 main.css 的 @theme 保持一致（两端 web/admin 已统一为同一套） */
const BREAKPOINTS = [
  { key: 'xs', px: 480, note: '小屏手机下限' },
  { key: 'sm', px: 576, note: '大屏手机 / 小折叠' },
  { key: 'md', px: 768, note: '平板竖屏' },
  { key: 'lg', px: 1024, note: '平板横屏 / 低分笔记本' },
  { key: 'xl', px: 1280, note: '桌面端起点（1280×800 那批笔记本）' },
  { key: 'note', px: 1366, note: '常规笔记本 —— 1366→1600 深水区的入口' },
  { key: '2xl', px: 1440, note: '高清笔记本 / 1080P 缩放后' },
  { key: '3xl', px: 1600, note: '宽屏笔记本' },
  { key: '4xl', px: 1920, note: '台式机大屏（配合 --container-1920 收口）' },
] as const

const { width } = useWindowSize()

/** 水合后再启用依赖视口的样式，避免 SSR/客户端 class 不一致 */
const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})

/** 当前视口落在哪一档（取 px <= width 的最后一档） */
const activeIndex = computed(() => {
  let idx = -1
  BREAKPOINTS.forEach((bp, i) => {
    if (width.value >= bp.px) {
      idx = i
    }
  })
  return idx
})
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Breakpoints</h1>
    <!--
      ⚠️ 这一行依赖 window 宽度，SSR 阶段拿不到（useWindowSize 是 0），
      必须交给 ClientOnly —— 否则服务端吐出的文本与客户端算出的不一致，会触发
      "Hydration completed but contains mismatches"（水合不匹配）。
      下面表格里的"当前是否生效"列同理。
    -->
    <ClientOnly>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
        当前视口宽度：<strong class="text-highlighted">{{ width }}px</strong> · 命中档位：<strong
          class="text-primary"
          >{{ activeIndex >= 0 ? BREAKPOINTS[activeIndex]!.key : '（低于最小档）' }}</strong
        >
        <span v-if="activeIndex >= 0" class="text-muted">（≥ {{ BREAKPOINTS[activeIndex]!.px }}px）</span>
      </p>
      <template #fallback>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          当前视口宽度：<strong class="text-highlighted">测量中…</strong>（需要浏览器环境）
        </p>
      </template>
    </ClientOnly>

    <div class="mt-6 overflow-hidden rounded-lg border border-default">
      <table class="w-full text-sm">
        <thead class="bg-elevated/60 text-xs text-muted">
          <tr>
            <th class="px-4 py-2 text-left font-medium">档位</th>
            <th class="px-4 py-2 text-left font-medium">从 (min-width)</th>
            <th class="px-4 py-2 text-left font-medium">说明</th>
            <th class="px-4 py-2 text-left font-medium">当前是否生效</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(bp, i) in BREAKPOINTS"
            :key="bp.key"
            class="border-t border-default"
            :class="isClient && i === activeIndex ? 'bg-primary/5' : ''"
          >
            <td class="px-4 py-2">
              <code class="text-xs" :class="i === activeIndex ? 'font-semibold text-primary' : 'text-muted'"
                >{{ bp.key }}:</code
              >
            </td>
            <td class="px-4 py-2 text-muted">{{ bp.px }}px</td>
            <td class="px-4 py-2 text-muted">{{ bp.note }}</td>
            <td class="px-4 py-2">
              <ClientOnly>
                <UIcon
                  v-if="i === activeIndex"
                  name="i-lucide-circle-check"
                  class="size-4 shrink-0 text-primary"
                  role="img"
                  aria-label="当前生效"
                />
                <span v-else class="text-xs text-dimmed">—</span>
              </ClientOnly>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ⚠️ 这一段是"断点真的编译进 CSS 了吗"的实测证据：只有生效的档位会显示文字 -->
    <section class="mt-8 rounded-lg border border-default bg-elevated/40 p-4">
      <h2 class="text-sm font-semibold text-highlighted">实测证据（Tailwind 变体真的生成了吗）</h2>
      <p class="mt-1 text-xs leading-5 text-muted">
        下面这些标签用 <code>hidden</code> + 各档位变体互斥显示。如果断点没进 Tailwind，
        这里会<strong>一片空白</strong>；能看到文字就说明该档位的 <code>@media (min-width: …)</code> 真的生成了。
      </p>
      <div class="mt-3 space-y-1 text-xs">
        <span class="block xs:hidden text-muted">· 低于最小档（连 <code>xs:</code> 都没到）</span>
        <span class="hidden xs:block sm:hidden text-muted">· <code>xs:</code> 生效</span>
        <span class="hidden sm:block md:hidden text-muted">· <code>sm:</code> 生效</span>
        <span class="hidden md:block lg:hidden text-muted">· <code>md:</code> 生效</span>
        <span class="hidden lg:block xl:hidden text-muted">· <code>lg:</code> 生效</span>
        <span class="hidden xl:block note:hidden text-muted">· <code>xl:</code> 生效</span>
        <span class="hidden note:block 2xl:hidden font-semibold text-primary"
          >· <code>note:</code> 生效 ← <strong>这一档 Tailwind 默认没有</strong></span
        >
        <span class="hidden 2xl:block 3xl:hidden font-semibold text-primary">· <code>2xl:</code> 生效</span>
        <span class="hidden 3xl:block 4xl:hidden font-semibold text-primary"
          >· <code>3xl:</code> 生效 ← <strong>这一档 Tailwind 默认没有</strong></span
        >
        <span class="hidden 4xl:block font-semibold text-primary"
          >· <code>4xl:</code> 生效 ← <strong>这一档 Tailwind 默认没有</strong></span
        >
      </div>
    </section>

    <section class="mt-6 rounded-lg border border-default bg-default p-4">
      <h2 class="text-sm font-semibold text-highlighted">⚠️ 这次的改动会影响现有写法</h2>
      <ul class="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">
        <li>
          <code>sm</code> 从 640 → <strong>576</strong>、<code>2xl</code> 从 1536 → <strong>1440</strong>（<code
            >xl</code
          >
          保持 1280）
        </li>
        <li><code>md</code> / <code>lg</code> / <code>xl</code> 数值与 Tailwind 默认一致或不变（768 / 1024 / 1280）</li>
        <li>
          新增 <code>xs:</code> / <code>note:</code> / <code>3xl:</code> / <code>4xl:</code> 四档 —— 其中
          <code>note:</code> / <code>3xl:</code> 就是填 1366–1600 那个空档
        </li>
        <li>
          语义不变（都是 min-width /
          移动端优先），所以<strong>不需要重写现有类名</strong>，但视觉切换点会变，需要过一遍关键页
        </li>
      </ul>
    </section>
  </div>
</template>
