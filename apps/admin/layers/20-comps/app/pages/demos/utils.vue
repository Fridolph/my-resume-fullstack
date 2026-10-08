<script setup lang="ts">
import * as z from "zod";
import {
  fmtCurrency,
  fmtIntl,
  fmtNumber,
  formatPercentDisplay,
  getNumPrecision,
  toNumber,
} from "~/utils/number";
import { chunkByPage } from "~/utils/pdf";
import { normalizeCompanyName, verifyCompanyNameWithABN } from "~/utils/company-validation";
import {
  formatPhoneInternational,
  generatePhoneMetadata,
  getPhoneNumberType,
} from "~/utils/phoneMetaData";
import { withErrorHandler } from "~/utils/error-handler";
import { zNonEmptyString, zPhone } from "~/utils/zodFunc";
import { designConsole } from "~/utils/design-console";

definePageMeta({
  layout: "has-sidebar",
  title: "Utils",
});

const toast = useToast();

/* ---------- number.ts ---------- */
const raw = ref(1234567.891);
const numberRows = computed(() => [
  { label: 'toNumber("12.5px")', value: String(toNumber("12.5px")) },
  { label: 'toNumber("abc")', value: String(toNumber("abc")) },
  { label: "getNumPrecision(0.0001234)", value: String(getNumPrecision(0.0001234)) },
  { label: "fmtNumber(raw)", value: fmtNumber(raw.value) },
  { label: "fmtNumber(raw, { precision: 2 })", value: fmtNumber(raw.value, { precision: 2 }) },
  {
    label: 'fmtNumber(raw, { thousands: "eu" })',
    value: fmtNumber(raw.value, { thousands: "eu" }),
  },
  {
    label: "fmtNumber(raw, { thousands: false })",
    value: fmtNumber(raw.value, { thousands: false }),
  },
  {
    label: 'fmtIntl(raw, "de-DE", EUR)',
    value: fmtIntl(raw.value, "de-DE", { style: "currency", currency: "EUR" }),
  },
  { label: 'fmtCurrency(raw, "$")', value: fmtCurrency(raw.value, "$") },
  {
    label: 'fmtUnit(raw, "kWh")',
    value: fmtNumber(raw.value, { precision: 1, symbol: "kWh", position: "after", space: true }),
  },
  {
    label: 'formatPercentDisplay(0.1234, "display")',
    value: JSON.stringify(formatPercentDisplay(0.1234, "display")),
  },
]);

/* ---------- pdf.ts ---------- */
const pdfItems = ref([1, 2, 3, 4, 5, 6, 7]);
const pdfPages = computed(() => chunkByPage(pdfItems.value, 3));

/* ---------- company-validation.ts ---------- */
const companyName = ref("ACME Pty. Ltd. & Co.");
const normalizedCompany = computed(() => normalizeCompanyName(companyName.value));

const abnName = ref("ACME Pty Ltd");
const abnNumber = ref("12345678901");
const abnResult = ref("-");
async function runAbnCheck() {
  // fetchInfo 由调用方注入，演示用 mock
  const res = await verifyCompanyNameWithABN(abnName.value, abnNumber.value, async () => ({
    entityName: "ACME PTY LTD",
    businessState: "NSW",
    businessPostCode: "2000",
    businessAddress: "1 Test Street, Sydney NSW 2000",
  }));
  abnResult.value = JSON.stringify(res);
}

/* ---------- phoneMetaData.ts ---------- */
const locale = ref("en");
const localeItems = [
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh" },
  { label: "Deutsch", value: "de" },
];
const allCountries = computed(() => generatePhoneMetadata(locale.value));
const countryRows = computed(() => allCountries.value.slice(0, 6));
const demoPhone = ref("+61412345678");
const phoneType = computed(() => getPhoneNumberType(demoPhone.value) ?? "unknown");
const phoneIntl = computed(() => formatPhoneInternational(demoPhone.value));

/* ---------- error-handler.ts ---------- */
const handlerResult = ref("-");
async function runErrorHandler() {
  const result = await withErrorHandler(
    async () => {
      throw new Error("boom");
    },
    (e) => {
      handlerResult.value = `handler 捕获: ${(e as Error).message}`;
    },
  );
  handlerResult.value = result === null ? `${handlerResult.value}（返回 null）` : String(result);
}

/* ---------- zodFunc.ts ---------- */
const zodSchema = z.object({
  name: zNonEmptyString("name is required"),
  phone: zPhone({ required: false, message: "invalid phone" }),
});
const zodInput = ref('{"name":"Alice","phone":"+61412345678"}');
const zodResult = computed(() => {
  try {
    const parsed = JSON.parse(zodInput.value);
    const r = zodSchema.safeParse(parsed);
    return r.success
      ? "✓ valid"
      : r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("  |  ");
  } catch {
    return "invalid JSON";
  }
});

/* ---------- design-console.ts ---------- */
function logConsole() {
  designConsole.info("info message");
  designConsole.success("success message");
  designConsole.warn("warn message");
  designConsole.error("error message");
  toast.add({
    title: "已写入 console（带样式）",
    description: "打开 DevTools 查看",
    color: "neutral",
  });
}
</script>

<template>
  <div class="content-pad max-w-4xl space-y-6">
    <div class="space-y-2">
      <h1 class="text-xl font-semibold tracking-tight text-highlighted">app/utils</h1>
      <p class="text-sm leading-6 text-muted">
        迁移自 greensketch
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">app/utils</code>
        的公共工具函数。Nuxt 的
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">utils/</code>
        目录会自动导入，组件里直接用即可。
      </p>
    </div>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">number.ts —— 数字 / 货币 / 百分比格式化</p>
          <p class="text-sm text-muted">
            分隔符、精度、符号全部由参数决定（不读站点 region）；基于 a-calc + radashi
          </p>
        </div>
      </template>
      <div class="space-y-3">
        <UFormField label="输入值" name="raw">
          <UInput v-model.number="raw" type="number" class="w-full" />
        </UFormField>
        <div class="divide-y divide-default rounded-lg border border-default text-sm">
          <div
            v-for="row in numberRows"
            :key="row.label"
            class="flex items-center justify-between gap-4 px-3 py-2"
          >
            <code class="text-xs text-muted">{{ row.label }}</code>
            <span class="truncate font-medium">{{ row.value }}</span>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">pdf.ts —— chunkByPage</p>
          <p class="text-sm text-muted">数组按每页条数切分，用于 PDF 明细自动分页</p>
        </div>
      </template>
      <div class="space-y-2 text-sm">
        <p class="text-muted">输入 <code class="text-xs">[1..7]</code>，每页 3 条 →</p>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="(page, i) in pdfPages" :key="i" color="neutral" variant="subtle">
            第 {{ i + 1 }} 页: [{{ page.join(", ") }}]
          </UBadge>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">company-validation.ts —— 公司名归一 / ABN 校验</p>
          <p class="text-sm text-muted">
            API 通过 <code class="text-xs">fetchInfo</code> 注入，工具本身与后端解耦
          </p>
        </div>
      </template>
      <div class="space-y-4">
        <div class="space-y-2">
          <UFormField label="公司名" name="company">
            <UInput v-model="companyName" class="w-full" />
          </UFormField>
          <p class="text-sm">
            normalizeCompanyName →
            <code class="text-xs">{{ normalizedCompany }}</code>
          </p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <UFormField label="公司名" name="abnName">
            <UInput v-model="abnName" class="w-full" />
          </UFormField>
          <UFormField label="ABN" name="abn">
            <UInput v-model="abnNumber" class="w-full" />
          </UFormField>
        </div>
        <UButton
          size="sm"
          icon="i-lucide-shield-check"
          label="运行校验（mock API）"
          @click="runAbnCheck"
        />
        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">{{ abnResult }}</pre>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">phoneMetaData.ts —— 各国电话元数据</p>
          <p class="text-sm text-muted">
            基于 libphonenumber-js：区号 / 国旗 / 名称 / maska 遮罩 / 号码类型
          </p>
        </div>
      </template>
      <div class="space-y-4">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="名称语言" name="locale">
            <USelect v-model="locale" :items="localeItems" class="w-40" />
          </UFormField>
          <UFormField label="示例号码" name="phone">
            <UInput v-model="demoPhone" class="w-52" />
          </UFormField>
          <div class="pb-2 text-sm">
            <UBadge :color="phoneType === 'unknown' ? 'neutral' : 'success'" variant="subtle">
              type: {{ phoneType }}
            </UBadge>
            <span class="ms-2 text-muted">{{ phoneIntl }}</span>
          </div>
        </div>
        <div class="overflow-auto rounded-lg border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated text-xs text-muted">
              <tr>
                <th class="px-3 py-2 text-left">code</th>
                <th class="px-3 py-2 text-left">name</th>
                <th class="px-3 py-2 text-left">dial</th>
                <th class="px-3 py-2 text-left">mobileMask</th>
                <th class="px-3 py-2 text-left">maxLen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in countryRows" :key="c.code" class="border-t border-default">
                <td class="px-3 py-2">{{ c.flag }} {{ c.code }}</td>
                <td class="px-3 py-2">
                  {{ c.name }}
                </td>
                <td class="px-3 py-2">
                  {{ c.dialCode }}
                </td>
                <td class="px-3 py-2 font-mono text-xs">
                  {{ c.mobileMask }}
                </td>
                <td class="px-3 py-2">
                  {{ c.maxNationalLength }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-dimmed">
          共 {{ allCountries.length }} 个国家和地区，此处展示前 6 个。
        </p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">error-handler.ts —— withErrorHandler</p>
          <p class="text-sm text-muted">统一 try/catch：失败时调 handler，并返回 null</p>
        </div>
      </template>
      <div class="space-y-2">
        <UButton
          size="sm"
          icon="i-lucide-bug"
          label="触发一个会抛错的任务"
          @click="runErrorHandler"
        />
        <pre class="overflow-auto rounded-lg bg-elevated p-3 text-xs">{{ handlerResult }}</pre>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">zodFunc.ts —— zNonEmptyString / zPhone</p>
          <p class="text-sm text-muted">zod 常用校验片段（手机号走 libphonenumber-js）</p>
        </div>
      </template>
      <div class="space-y-2">
        <UFormField label="输入（JSON）" name="zodInput">
          <UTextarea v-model="zodInput" :rows="2" class="w-full font-mono text-xs" />
        </UFormField>
        <p class="text-sm">
          校验结果：<code class="text-xs">{{ zodResult }}</code>
        </p>
        <p class="text-xs text-dimmed">
          试试 <code>{"name":"","phone":"abc"}</code> 或
          <code>{"name":"Bob","phone":"+61412345678"}</code>
        </p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <p class="font-semibold">design-console.ts —— designConsole</p>
          <p class="text-sm text-muted">带背景色的 console 输出（info / success / warn / error）</p>
        </div>
      </template>
      <UButton size="sm" icon="i-lucide-terminal" label="输出到 console" @click="logConsole" />
    </UCard>
  </div>
</template>
