<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'TextEditor',
})

const content = ref('<h2>Rich text editor</h2><p>Try the toolbar: headings, bold, lists, links, images, code blocks, variables…</p>')

const variables: IMention[] = [
  { id: 1, placeholder: '{{company_name}}', desc: 'Company name' },
  { id: 2, placeholder: '{{client_name}}', desc: 'Client full name' },
  { id: 3, placeholder: '{{proposal_link}}', desc: 'Proposal link' },
  { id: 4, placeholder: '{{sales_email}}', desc: 'Sales email' },
]
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">TextEditor</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      富文本编辑器 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">TextEditor</code>（基于
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">@nuxt/ui</code> 的
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">UEditor</code> + Tiptap）。
      支持标题/字体/颜色/对齐/列表/链接/图片/代码块/变量等，可通过 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">variables</code> 插入占位变量。
    </p>

    <div class="mt-6 max-w-3xl">
      <TextEditor
        v-model="content"
        :variables="variables"
        placeholder="Write something…"
      />
    </div>
  </div>
</template>
