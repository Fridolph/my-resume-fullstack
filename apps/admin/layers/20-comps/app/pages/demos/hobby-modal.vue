<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Hobby gallery',
})

/**
 * 兴趣图集的业务示例：公开简历的「兴趣」区点击一个兴趣 → 打开该兴趣的图集。
 *
 * 组件本身与业务无关（见 `/comps/full-screen-modal`），这里演示**数据怎么组织**：
 * 每个兴趣带一组 `images`，每张图可带 `title` 与 `href`（点了跳对应外链）。
 */
const shot = (text: string, color: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23${color}'/%3E%3Ctext x='200' y='172' font-size='72' font-family='sans-serif' fill='%23ffffff' text-anchor='middle'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`

interface Hobby {
  label: string
  icon: string
  description: string
  images: { url: string; title?: string; href?: string }[]
}

const hobbies: Hobby[] = [
  {
    label: '羽毛球',
    icon: 'i-lucide-trophy',
    description: '每周两场，快乐挥拍',
    images: [
      { url: shot('球', '2f9e63'), title: '球场', href: 'https://example.com/badminton/court' },
      { url: shot('拍', '15803d'), title: '球拍', href: 'https://example.com/badminton/racket' },
    ],
  },
  {
    label: '摄影',
    icon: 'i-lucide-camera',
    description: '扫街与旅行记录',
    images: [
      { url: shot('街', '1578d0'), title: '扫街', href: 'https://example.com/photo/street' },
      { url: shot('旅', '1d4ed8'), title: '在路上', href: 'https://example.com/photo/travel' },
    ],
  },
  {
    label: '写作',
    icon: 'i-lucide-pen-line',
    description: '技术笔记与复盘随笔',
    images: [
      { url: shot('文', 'b45309'), title: '技术笔记', href: 'https://example.com/blog/tech' },
      { url: shot('记', '92400e'), title: '复盘', href: 'https://example.com/blog/review' },
    ],
  },
  {
    label: '跑步',
    icon: 'i-lucide-footprints',
    description: '每周 15 公里',
    images: [
      { url: shot('跑', '7c3aed'), title: '夜跑', href: 'https://example.com/run/night' },
      { url: shot('道', '5b21b6'), title: '路线', href: 'https://example.com/run/route' },
    ],
  },
]

const open = ref(false)
const active = ref<Hobby | null>(null)

function openGallery(hobby: Hobby) {
  active.value = hobby
  open.value = true
}

const galleryItems = computed(() =>
  (active.value?.images ?? []).map((image, index) => ({
    id: `${active.value?.label ?? 'hobby'}-${index}`,
    url: image.url,
    title: image.title || active.value?.label,
    href: image.href,
  })),
)
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">兴趣图集（Hobby gallery）</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
      公开简历的「兴趣」区在 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">pro</code> 档是**可点的**：
      点一个兴趣打开 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">MyFullScreenGallery</code>，
      浏览该兴趣的图集（卡片可跳外链）。这里用一份示例数据复现同样的交互； 组件本身的契约与变体见
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">/comps/full-screen-modal</code>。
    </p>

    <div class="mt-6 rounded-lg border border-default bg-default p-6">
      <p class="text-sm text-muted">点下面的兴趣图标试试（每个都带 2 张图的图集）：</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <UButton
          v-for="hobby in hobbies"
          :key="hobby.label"
          :icon="hobby.icon"
          :label="hobby.label"
          color="neutral"
          variant="outline"
          @click="openGallery(hobby)"
        />
      </div>
    </div>

    <MyFullScreenGallery
      v-model:open="open"
      :title="active?.label"
      :description="active?.description"
      :items="galleryItems"
      empty-text="这个兴趣还没配图"
    />
  </div>
</template>
