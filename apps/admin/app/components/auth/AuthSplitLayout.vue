<script setup lang="ts">
import type { AuthSplitLayoutConfig } from "../../types/admin";

const props = withDefaults(defineProps<AuthSplitLayoutConfig>(), {
  imageSide: "right",
  imageAlt: "Decorative background",
  imageOverlay: "bg-linear-to-br from-emerald-500/80 via-cyan-500/45 to-blue-600/85",
});

const imageStyle = computed(() =>
  props.imageSrc ? { backgroundImage: `url(${props.imageSrc})` } : undefined,
);

const imageClasses = computed(() => [
  "relative min-h-56 overflow-hidden bg-linear-to-br from-emerald-500 via-cyan-500 to-blue-600 lg:min-h-dvh",
  props.imageSide === "left" ? "lg:order-first" : "lg:order-last",
]);
</script>

<template>
  <main
    class="grid min-h-dvh bg-default lg:grid-cols-[minmax(0,1fr)_38.2%]"
    :class="{ 'lg:grid-cols-[38.2%_minmax(0,1fr)]': imageSide === 'left' }"
  >
    <section class="flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-10">
      <header class="flex items-center justify-between gap-4">
        <slot name="brand">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 text-lg font-semibold text-highlighted"
          >
            <span
              class="grid size-8 place-items-center rounded-xl bg-primary text-sm font-bold text-inverted"
              >A</span
            >
            <span>Admin Studio</span>
          </NuxtLink>
        </slot>
        <slot name="header" />
      </header>

      <div class="flex flex-1 items-center justify-center py-14 lg:py-20">
        <div class="w-full max-w-md">
          <slot />
        </div>
      </div>

      <footer class="min-h-6">
        <slot name="footer" />
      </footer>
    </section>

    <aside :class="imageClasses" :style="imageStyle" role="img" :aria-label="imageAlt">
      <div
        class="absolute inset-0 bg-linear-to-br from-slate-950/10 via-transparent to-slate-950/30"
      />
      <div v-if="imageSrc" class="absolute inset-0 bg-cover bg-center" :style="imageStyle" />
      <div v-if="imageSrc" class="absolute inset-0" :class="imageOverlay" />
      <div
        v-else
        class="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_28%),linear-gradient(125deg,transparent_35%,rgba(255,255,255,.28)_35%,transparent_62%)]"
      />
      <div class="relative mt-auto p-8 text-white sm:p-12">
        <slot name="image-caption" />
      </div>
    </aside>
  </main>
</template>
