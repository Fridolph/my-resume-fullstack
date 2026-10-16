<script setup lang="ts">
definePageMeta({
  layout: 'docs',
  title: 'Help & guides',
})

/**
 * 帮助页 —— 这个系统**现在**能做什么、怎么用。
 *
 * ⚠️ 写作纪律：只写**已实现**的，逐条可回溯到提交或 `dao/tasks/*`；
 * 未实装的（AI 能力、通用上传端点）必须明确标注，**不许把"计划中"写成"已完成"**。
 * 这个页面此前是模板时代的英文占位（"demo flow, no backend yet"），与实现完全脱节。
 */
const sections = [
  { id: 'overview', label: '总览' },
  { id: 'getting-started', label: '快速开始' },
  { id: 'modules', label: '核心模块' },
  { id: 'ai-assistant', label: 'AI 助手' },
  { id: 'resources', label: '更多资源' },
]
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <p class="text-sm font-medium text-primary">Help &amp; guides</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-highlighted">这个系统能做什么，怎么用</h1>
    <p class="mt-3 text-sm leading-6 text-muted">
      三端职责、简历模块与公开站的一句话导读。深入内容在仓库的
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docs/</code> 里。
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
      <section id="overview" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">总览</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          这是一个**在线简历系统**：作者维护自己的简历，访客通过公开链接或公开首页直接查看。 技术栈是 Nuxt 4 + Nuxt UI 4
          + Tailwind CSS 4（前端）与 NestJS + Prisma + PostgreSQL（后端）， 以 pnpm workspace + Turborepo 组织。
        </p>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm font-medium text-highlighted">apps/web · 用户端</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              公开简历（<code class="rounded bg-elevated px-1 py-0.5 text-[11px]">/</code>、
              <code class="rounded bg-elevated px-1 py-0.5 text-[11px]">/resume/:id</code>） 与作者工作台（<code
                class="rounded bg-elevated px-1 py-0.5 text-[11px]"
                >/my-resumes</code
              >）。
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm font-medium text-highlighted">apps/admin · 管理端</p>
            <p class="mt-1 text-xs leading-5 text-muted">当前这个界面：简历管理、只读详情与两栏编辑页。</p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm font-medium text-highlighted">apps/server · 后端</p>
            <p class="mt-1 text-xs leading-5 text-muted">REST 接口、JWT 认证、权限校验与数据持久化。</p>
          </div>
        </div>
      </section>

      <section id="getting-started" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">快速开始</h2>
        <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>
            起本地依赖：<code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docker compose up -d</code> （PostgreSQL
            + Redis，见 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">compose.yaml</code>）。
          </li>
          <li>
            准备环境变量：复制 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">.env.example</code> 为
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">.env</code> 并填写；密钥只留在后端环境变量里。
          </li>
          <li>
            跑迁移与种子数据：<code class="rounded bg-elevated px-1.5 py-0.5 text-xs"
              >pnpm --filter @rs/server db:migrate</code
            >
            与 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">db:seed</code>。
          </li>
          <li>
            启动三端：<code class="rounded bg-elevated px-1.5 py-0.5 text-xs">pnpm dev</code>
            （web 4041 / admin 4047 / server 4049）。
          </li>
          <li>
            用种子账号从 <ULink to="/login" class="text-primary hover:underline">登录页</ULink> 进入， 然后在
            <ULink to="/resume" class="text-primary hover:underline">简历列表</ULink>
            里打开一份简历开始编辑。
          </li>
        </ol>
      </section>

      <section id="modules" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">核心模块</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <ULink to="/resume" class="rounded-xl border border-default p-4 transition-colors hover:bg-elevated">
            <p class="text-sm font-medium text-highlighted">简历管理</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              多份简历：创建、重命名、硬删除，以及互斥的「设为默认展示」。
            </p>
          </ULink>
          <ULink to="/resume" class="rounded-xl border border-default p-4 transition-colors hover:bg-elevated">
            <p class="text-sm font-medium text-highlighted">草稿与版本</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              自动保存（防抖）与 <code class="rounded bg-elevated px-1 py-0.5 text-[11px]">revision</code>
              条件更新：并发写入返回 409 而不是静默覆盖。
            </p>
          </ULink>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm font-medium text-highlighted">简历内容模块</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              7 类预设模块（基本信息 / 核心竞争力 / 教育 / 工作 / 项目 / 专业技能 / 自我评价）
              加**自定义模块**：自定标题、描述与四种展示方式（条目列表 / 标签簇 / 时间轴 / 富文本）。
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm font-medium text-highlighted">编排与展示</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              单栏 / 双栏 / 三栏，三档风格（minimal / standard / pro），主题与背景。
              样式配置只存浏览器本地，新访客用默认配置。
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm font-medium text-highlighted">公开站</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              <code class="rounded bg-elevated px-1 py-0.5 text-[11px]">/</code> 看默认简历、
              <code class="rounded bg-elevated px-1 py-0.5 text-[11px]">/resume/:id</code> 看指定简历，
              访客无需登录（SSR 直出）。作者可在页头切「编辑模式」就地拖拽与编辑。
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm font-medium text-highlighted">用户与权限</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              三角色（user / admin / super_admin）+ 权限键；JWT 认证，且**每次请求回查身份**恢复权限，
              所以权限变更不必等 token 过期。
            </p>
          </div>
        </div>
      </section>

      <section id="ai-assistant" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">AI 助手</h2>
        <UAlert
          class="mt-3"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="尚未实装"
          description="用户端已有 /ai-talk 入口与页面骨架，但对话能力本身还未接入。这里如实标注，避免把“计划中”读成“已完成”。"
        />
        <p class="mt-3 text-sm leading-6 text-muted">
          规划中的方向是"用 AI 辅助填写简历"——例如从上传的文件里抽取经历并填进对应模块。
          相关前置（通用上传端点）目前也未实现（见
          <ULink to="/release-notes" class="text-primary hover:underline">release notes</ULink> 的路线图）。
        </p>
      </section>

      <section id="resources" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">更多资源</h2>
        <ul class="mt-3 space-y-2 text-sm leading-6 text-muted">
          <li>
            <ULink to="/release-notes" class="text-primary hover:underline">Release notes</ULink>
            —— 每个版本做了什么、为什么，以及还在路上的事。
          </li>
          <li>
            <strong class="text-highlighted">核心设计</strong>：简历契约、模块与编排的设计依据在
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docs/dev/03_简历系统_核心设计.md</code>。
          </li>
          <li>
            <strong class="text-highlighted">身份与权限</strong>：三角色与权限键的设计在
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docs/dev/02_身份与权限_设计.md</code>。
          </li>
          <li>
            <strong class="text-highlighted">开发流程</strong>：分支模型与提交约定在
            <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docs/dev/01_开发流程_分支与提交.md</code>。
          </li>
          <li>
            <strong class="text-highlighted">框架文档</strong>：
            <ULink href="https://nuxt.com/docs" target="_blank" class="text-primary hover:underline">Nuxt</ULink>
            ·
            <ULink href="https://ui.nuxt.com" target="_blank" class="text-primary hover:underline">Nuxt UI</ULink>
            ·
            <ULink href="https://www.prisma.io/docs" target="_blank" class="text-primary hover:underline">Prisma</ULink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
