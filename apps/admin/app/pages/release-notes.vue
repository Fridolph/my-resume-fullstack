<script setup lang="ts">
definePageMeta({
  layout: "docs",
  title: "Release notes",
});

const sections = [
  { id: "latest", label: "Latest" },
  { id: "changelog", label: "Changelog" },
  { id: "dev-notes", label: "Dev notes" },
  { id: "roadmap", label: "Roadmap" },
];

interface Release {
  version: string;
  date: string;
  /** 尚未正式发布（显示 Unreleased 标注而非日期） */
  unreleased?: boolean;
  title: string;
  changes: string[];
}

const releases: Release[] = [
  {
    version: "0.2.0",
    date: "2026-10-06",
    unreleased: true,
    title: "Layers, component library & uploads",
    changes: [
      "Nuxt Layers: 11-projects / 12-teams / 13-settings / 20-comps (auto-discovered via $meta.name).",
      "Comps component library at /comps/* with a sidebar index.",
      "Modal: ModalConfirm, ModalResponsive (modal ≥768px / drawer on mobile), ModalForbidden.",
      "Loaders: LoadersColorSpin region loader.",
      "Tour: TourSpotlight / TourSpotlightStep + useSpotlightTour spotlight walkthrough.",
      "Text editor: Tiptap-based TextEditor (work in progress).",
      "Uploads: useFileUploader / useUploadFile + Files / UploadCell / UploadPDF / UploadProd, with file validation and an Alova XHR upload plugin (progress + abort).",
      "Request layer: utils/request.ts (AbortError detection); api.d.ts / file.d.ts types.",
      "Base styles: content-pad spacing, 1920px content cap, named-page print styles, tw-animate-css.",
      "Developer docs under docs/dev (naming pitfalls, layout/component patterns, CSS conventions, layers).",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-10-05",
    title: "Initial scaffold",
    changes: [
      "Auth split layout + login form (demo flow, no backend yet).",
      "has-sidebar / empty / demo / docs layouts.",
      "Settings secondary sidebar + placeholder pages.",
      "AdminUserMenu dropdown in the sidebar footer.",
    ],
  },
];
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <p class="text-sm font-medium text-primary">Release notes</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-highlighted">
      Changelog &amp; development notes.
    </h1>
    <p class="mt-3 text-sm leading-6 text-muted">What changed, why, and what's coming next.</p>

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
        <h2 class="text-xl font-semibold text-highlighted">Latest</h2>
        <div
          v-for="release in releases"
          :key="release.version"
          class="mt-4 rounded-xl border border-default p-5"
        >
          <div class="flex items-baseline gap-3">
            <span class="text-lg font-semibold text-highlighted">v{{ release.version }}</span>
            <span class="text-xs text-dimmed">{{ release.unreleased ? "Unreleased" : release.date }}</span>
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
        <h2 class="text-xl font-semibold text-highlighted">Changelog</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          Full changelog follows semantic versioning. Add past releases here as the project grows.
        </p>
      </section>

      <section id="dev-notes" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">Dev notes</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          Development notes and learnings are collected here — for example, the Nuxt naming
          pitfalls recorded in <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">docs/dev</code>.
        </p>
      </section>

      <section id="roadmap" class="scroll-mt-24">
        <h2 class="text-xl font-semibold text-highlighted">Roadmap</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>Wire up real authentication.</li>
          <li>Add AI assistant capabilities.</li>
          <li>Fill in projects and team modules.</li>
        </ul>
      </section>
    </div>
  </div>
</template>
