<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { TableColumn } from "@nuxt/ui";
import type { PdfAlign, PdfCoverImageMode, PdfTextVertical } from "~/types/pdf";
import * as z from "zod";

/**
 * PDF 预览 / 导出 demo（原 /comps/pdf-review，迁到 /demos 下）。
 *
 * 交互：
 * - pdf 布局右上角工具栏 Back / **Config** / Print；点 Config 才弹出配置抽屉；
 * - 抽屉里用 UForm + Zod 校验，footer 是 Cancel / Save（Save 校验通过才生效）；
 * - 页面渲染只读 `config`（生效配置），drawer 编辑的是 `draft`（见 usePdfConfig）。
 *
 * 后续做个人简历：改 `createDefaultPdfConfig()` 的默认值 + 换掉下面几页内容即可。
 */
definePageMeta({
  layout: "pdf",
  title: "PDF review",
});

const toast = useToast();

// 抽屉开关 / 生效配置 / 编辑态 / 保存取消
const {
  open: configOpen,
  config,
  draft,
  save: saveConfig,
  cancel: cancelConfig,
  reset: resetDraft,
} = usePdfConfig();

/* ---------- 表单校验（参考项目既有 UForm + Zod 写法） ----------
 * - 导出文件名：必填
 * - 封面页开启时：标题必填，其余可选
 */
const schema = z
  .object({
    fileName: z.string().trim().min(1, "导出文件名必填"),
    header: z.object({
      enabled: z.boolean(),
      title: z.string().optional(),
      meta: z.string().optional(),
    }),
    cover: z.object({
      enabled: z.boolean(),
      title: z.string().optional(),
      eyebrow: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
      imageMode: z.enum(["none", "banner", "background"]).optional(),
      footerTitle: z.string().optional(),
      footerText: z.string().optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      vertical: z.enum(["top", "center", "bottom"]).optional(),
      gradientFrom: z.string().optional(),
      gradientTo: z.string().optional(),
    }),
  })
  .superRefine((value, ctx) => {
    // 只有开启封面页时才要求标题
    if (value.cover.enabled && !value.cover.title?.trim()) {
      ctx.addIssue({ code: "custom", path: ["cover", "title"], message: "开启封面页时标题必填" });
    }
  });

const formRef = useTemplateRef<{ submit: () => Promise<unknown> }>("formRef");

/** UForm 校验通过才会触发 @submit */
function onSubmit(_event: FormSubmitEvent<z.output<typeof schema>>) {
  saveConfig();
  toast.add({ title: "Config saved", description: config.value.fileName, color: "success" });
}

/** footer 的 Save：走一遍表单校验 */
async function submitForm() {
  await formRef.value?.submit();
}

function resetConfig() {
  resetDraft();
  toast.add({ title: "Reset to defaults", description: "点 Save 生效", color: "neutral" });
}

const alignItems: { label: string; value: PdfAlign }[] = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

const verticalItems: { label: string; value: PdfTextVertical }[] = [
  { label: "Top", value: "top" },
  { label: "Center", value: "center" },
  { label: "Bottom", value: "bottom" },
];

const imageModeItems: { label: string; value: PdfCoverImageMode }[] = [
  { label: "None", value: "none" },
  { label: "Banner (top)", value: "banner" },
  { label: "Background (full)", value: "background" },
];

// SSR / CSR 保持一致的“今天”，供页眉 meta = 'auto' 使用
const today = useState("pdf-demo-today", () => new Date().toISOString().slice(0, 10));
const headerMeta = computed(() =>
  config.value.header.meta === "auto" ? today.value : (config.value.header.meta ?? ""),
);

/* ---------- 后端导出（预留） ---------- */
const requestUrl = useRequestURL();
const previewUrl = computed(() => (import.meta.client ? window.location.href : requestUrl.href));

const { isPending, exportPdf, printPdf } = usePdfExport({
  onSuccess: (url) => toast.add({ title: "PDF ready", description: url, color: "success" }),
  onError: (e) =>
    toast.add({
      title: "Export failed",
      description: getApiErrorMessage(e) || "后端导出未接入，可先用 Print 降级。",
      color: "error",
    }),
});

async function exportServer() {
  // 用生效配置（config），不把未保存的 draft 带出去
  await exportPdf({
    url: previewUrl.value,
    scene: "pdf-review",
    fileName: config.value.fileName,
    options: { cover: config.value.cover.enabled, header: config.value.header.enabled },
  });
}

/* ---------- mock 内容 ---------- */
const summary = [
  { label: "Active projects", value: "24", diff: "+12.5%" },
  { label: "Team members", value: "18", diff: "+4.2%" },
  { label: "Open tasks", value: "62", diff: "-8.1%" },
];

const projectRows = [
  { name: "Northwind rollout", owner: "Alex Morgan", status: "In progress", updated: "2026-10-04" },
  { name: "Harbor solar array", owner: "Jamie Lee", status: "Sent", updated: "2026-10-03" },
  { name: "Maple battery retrofit", owner: "Alex Morgan", status: "Signed", updated: "2026-10-01" },
  { name: "Riverside microgrid", owner: "Priya Nair", status: "Ordered", updated: "2026-09-28" },
  { name: "Coastal wind survey", owner: "Jamie Lee", status: "Closed", updated: "2026-09-20" },
];

const activity = [
  { title: "Project brief approved", meta: "Northwind rollout", time: "12 min ago" },
  { title: "New team member joined", meta: "Alex Morgan", time: "46 min ago" },
  { title: "Review requested", meta: "Q4 campaign workspace", time: "2 hr ago" },
  { title: "Proposal sent", meta: "Harbor solar array", time: "5 hr ago" },
];

const columns: TableColumn<(typeof projectRows)[number]>[] = [
  { accessorKey: "name", header: "Project" },
  { accessorKey: "owner", header: "Owner" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "updated", header: "Updated" },
];
</script>

<template>
  <!-- 配置抽屉：由 pdf 布局的 Config 按钮打开（usePdfConfig 共享状态） -->
  <UDrawer
    v-model:open="configOpen"
    title="PDF config"
    description="改完点 Save 生效；Cancel 放弃本次改动"
    :ui="{ content: 'max-w-md w-full' }"
  >
    <template #body>
      <UForm ref="formRef" :schema="schema" :state="draft" class="space-y-4" @submit="onSubmit">
        <UFormField name="fileName" label="导出文件名" required hint="默认 pdf-review_日期时间.pdf">
          <UInput v-model="draft.fileName" class="w-full" />
        </UFormField>

        <USeparator />

        <USwitch
          v-model="draft.cover.enabled"
          label="封面页"
          description="关闭后直接从内容页开始"
        />

        <template v-if="draft.cover.enabled">
          <UFormField name="cover.title" label="标题" required>
            <UInput v-model="draft.cover.title" placeholder="如：张三 · 个人简历" class="w-full" />
          </UFormField>

          <UFormField name="cover.eyebrow" label="Eyebrow" hint="可选">
            <UInput v-model="draft.cover.eyebrow" placeholder="如 Resume / Report" class="w-full" />
          </UFormField>

          <UFormField name="cover.description" label="描述" hint="可选">
            <UTextarea v-model="draft.cover.description" :rows="2" class="w-full" />
          </UFormField>

          <UFormField name="cover.image" label="封面图 URL" hint="可选">
            <UInput
              v-model="draft.cover.image"
              placeholder="https://… 或 /cover.jpg"
              class="w-full"
            />
          </UFormField>

          <UFormField name="cover.imageMode" label="图片模式" hint="可选">
            <USelect v-model="draft.cover.imageMode" :items="imageModeItems" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField name="cover.align" label="水平位置">
              <USelect v-model="draft.cover.align" :items="alignItems" class="w-full" />
            </UFormField>
            <UFormField name="cover.vertical" label="垂直位置">
              <USelect v-model="draft.cover.vertical" :items="verticalItems" class="w-full" />
            </UFormField>
          </div>

          <UFormField name="cover.footerTitle" label="底部标题" hint="可选">
            <UInput v-model="draft.cover.footerTitle" class="w-full" />
          </UFormField>

          <UFormField name="cover.footerText" label="底部说明" hint="可选">
            <UTextarea v-model="draft.cover.footerText" :rows="2" class="w-full" />
          </UFormField>
        </template>

        <USeparator />

        <USwitch v-model="draft.header.enabled" label="每页页眉" description="标题 + 日期" />

        <template v-if="draft.header.enabled">
          <UFormField name="header.title" label="页眉标题" hint="可选">
            <UInput v-model="draft.header.title" class="w-full" />
          </UFormField>
          <UFormField name="header.meta" label="页眉右侧" hint="填 auto 用今天日期">
            <UInput v-model="draft.header.meta" class="w-full" />
          </UFormField>
        </template>
      </UForm>

      <USeparator class="my-4" label="Server export" />

      <div class="space-y-2">
        <UButton
          icon="i-lucide-cloud-download"
          color="neutral"
          variant="outline"
          size="sm"
          block
          label="Export (server)"
          :loading="isPending"
          @click="exportServer"
        />
        <p class="text-xs text-muted">
          后端导出接口见
          <code class="rounded bg-elevated px-1">apis/pdf.ts</code>；暂无后端时会失败，用 Print
          降级。
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <UButton label="Reset" color="neutral" variant="link" size="sm" @click="resetConfig" />
        <div class="flex items-center gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="cancelConfig" />
          <UButton label="Save" @click="submitForm" />
        </div>
      </div>
    </template>
  </UDrawer>

  <PdfDocVnode :exclude-cover="config.cover.enabled">
    <!-- 封面：由 config.cover.enabled 决定要不要 -->
    <PdfCoverSheet v-if="config.cover.enabled" :config="config.cover" />

    <!-- 页 1 · 概览 -->
    <PdfPage>
      <template v-if="config.header.enabled" #header>
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span class="font-medium text-gray-900">{{ config.header.title }}</span>
          <span>{{ headerMeta }}</span>
        </div>
      </template>

      <section class="pt-4">
        <h2 class="text-lg font-semibold text-gray-900">Summary</h2>

        <div class="mt-4 grid grid-cols-3 gap-4">
          <div
            v-for="item in summary"
            :key="item.label"
            class="rounded-lg border border-gray-200 p-4"
          >
            <p class="text-xs text-gray-500">
              {{ item.label }}
            </p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">
              {{ item.value }}
            </p>
            <p class="mt-1 text-xs text-emerald-600">
              {{ item.diff }}
            </p>
          </div>
        </div>

        <p class="mt-6 text-sm leading-6 text-gray-600">
          本页演示纸张外壳：`header` 插槽 + 可打印内容区 + 自动页码页脚。任意现有组件都能塞进来——
          <code class="rounded bg-gray-100 px-1 py-0.5 text-xs">PdfPage</code> 只负责纸张。
        </p>
      </section>
    </PdfPage>

    <!-- 页 2 · 表格 -->
    <PdfPage>
      <template v-if="config.header.enabled" #header>
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span class="font-medium text-gray-900">{{ config.header.title }}</span>
          <span>{{ headerMeta }}</span>
        </div>
      </template>

      <section class="pt-4">
        <h2 class="text-lg font-semibold text-gray-900">Project list</h2>

        <UTable
          class="mt-4"
          :data="projectRows"
          :columns="columns"
          :ui="{
            th: 'text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left',
            td: 'text-sm text-gray-700 border-b border-gray-100 px-3 py-2',
          }"
        />
      </section>
    </PdfPage>

    <!-- 页 3 · 列表 -->
    <PdfPage>
      <template v-if="config.header.enabled" #header>
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span class="font-medium text-gray-900">{{ config.header.title }}</span>
          <span>{{ headerMeta }}</span>
        </div>
      </template>

      <section class="pt-4">
        <h2 class="text-lg font-semibold text-gray-900">Recent activity</h2>

        <ul class="mt-4 divide-y divide-gray-100">
          <li
            v-for="item in activity"
            :key="item.title"
            class="flex items-center justify-between py-3"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">
                {{ item.title }}
              </p>
              <p class="text-xs text-gray-500">
                {{ item.meta }}
              </p>
            </div>
            <span class="text-xs text-gray-400">{{ item.time }}</span>
          </li>
        </ul>
      </section>
    </PdfPage>
  </PdfDocVnode>
</template>
