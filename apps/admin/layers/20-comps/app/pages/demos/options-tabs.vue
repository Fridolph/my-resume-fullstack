<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";
import type { Resume } from "~/config/resume-demo";
import { RESUMES, RESUME_COMPARE_FIELDS, RESUME_STATUS_META } from "~/config/resume-demo";

/**
 * 多份简历 tabs demo（参考 greensketch ProposalOptionsTab）。
 *
 * - 顶部 tab 条切换 / 查看 / 对比（options > 1 时显示对比按钮）
 * - 下方展示当前简历详情
 * - 「编辑」打开抽屉，改完保存到本地列表（模拟后端）
 */
definePageMeta({
  layout: "demo",
  title: "Resume options tabs",
});

const toast = useToast();

const resumes = ref<Resume[]>(JSON.parse(JSON.stringify(RESUMES)));
const activeId = ref<number | null>(resumes.value[0]?.id ?? null);
const compareOpen = ref(false);
const editOpen = ref(false);

const activeResume = computed(() => resumes.value.find((r) => r.id === activeId.value) ?? null);

function onOptionChange(id: number) {
  activeId.value = id;
}

/* ---------- 编辑抽屉 ---------- */
const draft = ref<Resume | null>(null);
const statusItems = [
  { label: "草稿", value: "draft" },
  { label: "定稿", value: "final" },
  { label: "归档", value: "archived" },
];

const schema = z.object({
  name: z.string().trim().min(1, "名称必填"),
  targetRole: z.string().trim().min(1, "目标岗位必填"),
  summary: z.string().optional(),
});

const formRef = useTemplateRef<{ submit: () => Promise<unknown> }>("formRef");

function openEdit() {
  draft.value = JSON.parse(JSON.stringify(activeResume.value));
  editOpen.value = true;
}

function onSubmit(_e: FormSubmitEvent<z.output<typeof schema>>) {
  const target = resumes.value.find((r) => r.id === draft.value!.id);
  if (target) {
    Object.assign(target, draft.value);
  }
  editOpen.value = false;
  toast.add({ title: "已保存", description: target?.name, color: "success" });
}

async function submitForm() {
  await formRef.value?.submit();
}

const salaryItems = [
  { label: "10k", value: 10 },
  { label: "18k", value: 18 },
  { label: "28k", value: 28 },
  { label: "35k", value: 35 },
  { label: "45k", value: 45 },
];
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-highlighted">多份简历 · 标签页切换 / 编辑 / 对比</h1>
      <p class="mt-1 text-sm text-muted">
        对应 greensketch ProposalOptionsTab：每份简历一个 tab，可切换查看、编辑、对比差异。
      </p>
    </div>

    <div class="overflow-hidden rounded-lg border border-default bg-default">
      <ResumeOptionsTab
        v-model:active-id="activeId"
        :options="resumes"
        @option-change="onOptionChange"
        @compare="compareOpen = true"
      />

      <!-- 当前简历详情 -->
      <div v-if="activeResume" class="p-4 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-semibold text-highlighted">{{ activeResume.name }}</h2>
              <UBadge
                variant="soft"
                :label="RESUME_STATUS_META[activeResume.status].label"
                :ui="{
                  base: `px-1 py-0 rounded-sm ${RESUME_STATUS_META[activeResume.status].class}`,
                }"
              />
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ activeResume.targetRole }} · {{ activeResume.location }} ·
              {{ activeResume.updatedAt }}
            </p>
          </div>
          <UButton icon="i-lucide-pencil" size="sm" label="编辑" @click="openEdit" />
        </div>

        <p class="mt-4 text-sm leading-6 text-muted">{{ activeResume.summary }}</p>

        <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div
            v-for="item in [
              { label: '工作年限', value: `${activeResume.yearsOfExperience} 年` },
              { label: '期望薪资', value: `${activeResume.expectedSalary}k` },
              { label: '技能', value: `${activeResume.skillsCount} 项` },
              { label: '项目', value: `${activeResume.projectsCount} 个` },
            ]"
            :key="item.label"
            class="rounded-lg border border-default p-3"
          >
            <p class="text-xs text-muted">{{ item.label }}</p>
            <p class="mt-1 text-lg font-semibold text-highlighted">{{ item.value }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 对比弹窗 -->
  <ResumeCompareModal
    v-model:open="compareOpen"
    :options="resumes"
    :fields="RESUME_COMPARE_FIELDS"
  />

  <!-- 编辑抽屉 -->
  <UDrawer
    v-model:open="editOpen"
    title="编辑简历"
    description="改完点 Save 生效"
    :ui="{ content: 'max-w-md w-full' }"
  >
    <template #body>
      <UForm
        v-if="draft"
        ref="formRef"
        :schema="schema"
        :state="draft"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField name="name" label="版本名称" required>
          <UInput v-model="draft.name" class="w-full" />
        </UFormField>

        <UFormField name="targetRole" label="目标岗位" required>
          <UInput v-model="draft.targetRole" class="w-full" />
        </UFormField>

        <UFormField label="状态">
          <USelect v-model="draft.status" :items="statusItems" class="w-full" />
        </UFormField>

        <UFormField label="期望薪资">
          <USelect v-model="draft.expectedSalary" :items="salaryItems" class="w-full" />
        </UFormField>

        <UFormField name="summary" label="简介">
          <UTextarea v-model="draft.summary" :rows="3" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="editOpen = false" />
        <UButton label="Save" @click="submitForm" />
      </div>
    </template>
  </UDrawer>
</template>
