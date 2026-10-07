import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  srcDir: "app",
  modules: ["@nuxt/ui", "@pinia/nuxt", "@pinia/colada-nuxt"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:4049/api",
    },
  },
  typescript: { strict: true, typeCheck: true },
  compatibilityDate: "2025-01-01",
});
