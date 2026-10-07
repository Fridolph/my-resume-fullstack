import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  srcDir: "app",
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:4049/api",
    },
  },
  typescript: { strict: true, typeCheck: true },
  compatibilityDate: "2025-01-01",

  vite: {
    optimizeDeps: {
      include: [
        // ProseMirror 预打包成单实例，避免 Tiptap 报 "Adding different instances of a keyed plugin"
        "@nuxt/ui > prosemirror-gapcursor",
        "@nuxt/ui > prosemirror-model",
        "@nuxt/ui > prosemirror-state",
        "@nuxt/ui > prosemirror-tables",
        "@nuxt/ui > prosemirror-transform",
        "@nuxt/ui > prosemirror-view",
        "@tiptap/core",
        "@tiptap/extension-code-block-lowlight",
        "@tiptap/extension-emoji",
        "@tiptap/extension-horizontal-rule",
        "@tiptap/extension-link",
        "@tiptap/extension-list",
        "@tiptap/extension-subscript",
        "@tiptap/extension-superscript",
        "@tiptap/extension-table",
        "@tiptap/extension-text-align",
        "@tiptap/extension-text-style",
        "@tiptap/vue-3",
        "highlight.js/lib/languages/css",
        "highlight.js/lib/languages/javascript",
        "highlight.js/lib/languages/typescript",
        "highlight.js/lib/languages/xml",
        "lowlight",
      ],
    },
  },
});
