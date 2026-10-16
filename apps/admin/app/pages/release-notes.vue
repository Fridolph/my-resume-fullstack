<script setup lang="ts">
import { RESUME_RELEASES } from '@rs/common'

definePageMeta({
  layout: 'docs',
  title: 'Release notes',
})

/**
 * 发版记录页。
 *
 * ⚠️ **数据不写在这里**：`RESUME_RELEASES` 来自 `@rs/common`，由
 * `scripts/sync-release-notes.mjs` 从 `CHANGELOG.md` 生成、并挂在 `release-it` 的发版钩子上。
 * 所以"发版 → 这个页面自动更新"是同一条链路的结果，页面本身不需要被脚本改写。
 * 要修正措辞，改 `CHANGELOG.md` 的对应条目。
 */
const releases = RESUME_RELEASES

const sections = [
  { id: 'latest', label: '最新版本' },
  { id: 'changelog', label: '完整变更' },
  { id: 'dev-notes', label: '开发记录' },
  { id: 'roadmap', label: '路线图' },
]
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <p class="text-sm font-medium text-primary">Release notes</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-highlighted">版本变更与开发记录</h1>
    <p class="mt-3 text-sm leading-6 text-muted">
      每个版本做了什么、为什么这么做，以及还在路上的事。本页数据由
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">CHANGELOG.md</code> 同步而来。
    </p>

    <!-- 锚点导航 -->
    <nav class="mt-6 flex flex-wrap gap-2">
      <a
        v-for="section in sections"
        :key="section.id"
        :href="`#${section.id}`"
        class="rounded-full border border-default px-3 py-1.5 text-sm text-muted transition-colors hover:bg-elevated hover:text-highlighted"
      >
        {{ section.label }}
      </a>
    </nav>

    <div class="mt-10 space-y-12">
      <section id="latest" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">最新版本</h2>
        <div v-for="release in releases" :key="release.version" class="mt-4 rounded-xl border border-default p-5">
          <div class="flex items-baseline gap-3">
            <span class="text-lg font-semibold text-highlighted">v{{ release.version }}</span>
            <span class="text-xs text-dimmed">{{ release.unreleased ? 'Unreleased' : release.date }}</span>
          </div>
          <p class="mt-1 text-sm font-medium text-highlighted">{{ release.title }}</p>
          <ul class="mt-3 space-y-1.5 text-sm text-muted">
            <li v-for="change in release.changes" :key="change" class="flex gap-2">
              <span class="text-primary">·</span>
              <span>{{ change }}</span>
            </li>
          </ul>
        </div>
      </section>

      <section id="changelog" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">完整变更</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          遵循<a class="text-primary hover:underline" href="https://semver.org/lang/zh-CN/" target="_blank"
            >语义化版本</a
          >， 由 Conventional Commits 自动生成。完整历史见仓库根目录的
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">CHANGELOG.md</code>。
        </p>
        <p class="mt-3 text-sm leading-6 text-muted">
          提交类型到分组的映射（与
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">.release-it.json</code> 一致）：
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">feat</code> 新功能 ·
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">fix</code> 问题修复 ·
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">refactor</code> 重构 ·
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docs</code> 文档 ·
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">test</code> 测试 ·
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">build</code> 构建。
        </p>
      </section>

      <section id="dev-notes" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">Dev notes</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          开发过程中踩到并已固化的结论（都写进了代码注释或
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docs/dev</code>），例如：
        </p>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>
            <strong class="text-highlighted">页面根模板不能写具名插槽</strong>：想在布局页头放"保存 / 取消"， Vue
            编译器会直接报 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">Codegen node is missing</code>；
            改为页面自带的 sticky 操作条。
          </li>
          <li>
            <strong class="text-highlighted"
              >SSR 下 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">useAsyncData</code> 会吞掉 404
              语义</strong
            >： 异常被包成
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">NuxtError(500)</code> 且丢掉业务错误码，
            所以"资源不存在"要在取数时就定成正常返回值。
          </li>
          <li>
            <strong class="text-highlighted">Vite 按需预打包会造出两个 prosemirror 实例</strong>： 富文本编辑器挂载即抛
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">Adding different instances of a keyed plugin</code
            >， 需在 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">optimizeDeps.include</code> 里固定。
          </li>
          <li>
            <strong class="text-highlighted">样式配置留在浏览器本地</strong>：版式与主题不入库（新访客用默认配置），
            只有内容与展示元信息走服务端。
          </li>
        </ul>
      </section>

      <section id="roadmap" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">Roadmap</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>
            <strong class="text-highlighted">测试体系</strong>：引入 vitest（各包独立安装），
            并让"没有测试"与"测试通过"可区分 —— 历史上删光测试文件质量门依然是绿的（Issue #48）。
          </li>
          <li>
            <strong class="text-highlighted">发版管理</strong>：用 release-it 取代 standard-version， 发版时同步
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">CHANGELOG.md</code> 与本页数据（Issue #50）。
          </li>
          <li>
            <strong class="text-highlighted">通用上传端点</strong>：文件上传接口与本地落盘策略（DAO-036）； admin 侧的 4
            个上传组件目前**没有调用点**，接口也尚未实现。
          </li>
          <li>
            <strong class="text-highlighted">AI 助手</strong>：<code class="rounded bg-elevated px-1.5 py-0.5 text-xs"
              >/ai-talk</code
            >
            目前只有入口与骨架，能力**尚未实装**。
          </li>
          <li><strong class="text-highlighted">简历编辑体验</strong>：工作台与 admin 编辑页统一为同一套两栏交互。</li>
        </ul>
      </section>
    </div>
  </div>
</template>
