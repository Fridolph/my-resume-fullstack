<script setup lang="ts">
definePageMeta({
  layout: 'docs',
  title: 'Help & guides',
})

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'getting-started', label: 'Getting started' },
  { id: 'modules', label: 'Key modules' },
  { id: 'ai-assistant', label: 'AI assistant' },
  { id: 'resources', label: 'Resources' },
]
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <p class="text-sm font-medium text-primary">Help &amp; guides</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-highlighted">What this app does, and how to use it.</h1>
    <p class="mt-3 text-sm leading-6 text-muted">
      A concise walkthrough of the workspace, its modules, and where to find more help.
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
        <h2 class="text-xl font-semibold text-highlighted">Overview</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          This admin workspace is the control center for managing projects, team, and settings. It is built on Nuxt 4 +
          Nuxt UI and serves as a reusable starting point for admin applications.
        </p>
      </section>

      <section id="getting-started" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">Getting started</h2>
        <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>
            Sign in from the
            <ULink to="/login" class="text-primary hover:underline">login page</ULink>.
          </li>
          <li>Use the left sidebar to switch between modules.</li>
          <li>
            Start from the
            <ULink to="/" class="text-primary hover:underline">dashboard</ULink>, then drill into projects and team.
          </li>
        </ol>
      </section>

      <section id="modules" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">Key modules</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <ULink to="/projects" class="rounded-xl border border-default p-4 transition-colors hover:bg-elevated">
            <p class="text-sm font-medium text-highlighted">Projects</p>
            <p class="mt-1 text-xs text-muted">Manage projects and their status.</p>
          </ULink>
          <ULink to="/team/members" class="rounded-xl border border-default p-4 transition-colors hover:bg-elevated">
            <p class="text-sm font-medium text-highlighted">Team</p>
            <p class="mt-1 text-xs text-muted">Members and roles &amp; access.</p>
          </ULink>
          <ULink to="/settings" class="rounded-xl border border-default p-4 transition-colors hover:bg-elevated">
            <p class="text-sm font-medium text-highlighted">Settings</p>
            <p class="mt-1 text-xs text-muted">Company profile and configuration.</p>
          </ULink>
        </div>
      </section>

      <section id="ai-assistant" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">AI assistant</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          Documentation for AI-powered features will live here. For now this section is a placeholder for onboarding,
          prompt guidance, and usage tips.
        </p>
      </section>

      <section id="resources" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">Resources</h2>
        <ul class="mt-3 space-y-2 text-sm">
          <li>
            <ULink href="https://nuxt.com/docs" target="_blank" class="text-primary hover:underline">
              Nuxt documentation
            </ULink>
          </li>
          <li>
            <ULink href="https://ui.nuxt.com" target="_blank" class="text-primary hover:underline"> Nuxt UI </ULink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
