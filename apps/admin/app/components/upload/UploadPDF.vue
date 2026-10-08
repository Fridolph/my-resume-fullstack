<script lang="ts" setup>
import { FileApi } from "~/apis/files";
import { useUploadFile } from "~/composables/useUploadFile";

interface Document {
  fileName: string;
  originalFilePath: string;
  thumbnailFilePath?: string | null;
}

interface Props {
  modelValue?: Document[] | null;
  disabled?: boolean;
  loading?: boolean;
  maxCount?: number;
  maxFileSize?: number;
}

interface Emits {
  (event: "update:modelValue", value: Document[]): void;
  (event: "uploadStart"): void;
  (event: "uploadEnd"): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
  maxCount: 4,
  maxFileSize: 50 * 1024 * 1024, // 50MB
});

const emit = defineEmits<Emits>();

const uploadPdfFiles = ref<File[]>([]);

const { loading: hookLoading, handleFileSelect } = useUploadFile({
  maxFileSize: props.maxFileSize,
  accept: ["application/pdf"],
  apiContentType: 2,
  onSuccess: () => {
    emit("uploadEnd");
  },
});

const documents = computed({
  get: () => props.modelValue || [],
  set: (val) => emit("update:modelValue", val),
});

async function uploadPdf(files: File[] | null | undefined) {
  if (!files || files.length === 0) {
    return;
  }

  emit("uploadStart");
  const res = await handleFileSelect(files, async (formData) => {
    return FileApi.uploadFile(formData, { contentType: 2 });
  });

  if (res) {
    documents.value = [...documents.value, ...res];
    uploadPdfFiles.value = [];
  }
}

function delDocument(item: Document) {
  documents.value = documents.value.filter((v) => v.originalFilePath !== item.originalFilePath);
}

function downloadDocument(item: Document) {
  window.open(item.originalFilePath, "_blank");
}

const isLoading = computed(() => props.loading || hookLoading.value);
const canAddMore = computed(
  () => !props.disabled && documents.value.length < (props.maxCount || 4),
);
</script>

<template>
  <div class="flex max-w-240 flex-wrap gap-2">
    <!-- 已上传的文件列表 -->
    <div
      v-for="doc in documents"
      :key="doc.originalFilePath"
      class="w-58 rounded-lg border border-solid border-gray-200 p-4"
    >
      <div class="flex flex-col items-center justify-center gap-1 text-center">
        <UIcon name="i-lucide-file-text" class="text-2xl" size="2rem" />
        <div class="line-clamp-2 text-xs">
          {{ doc.fileName }}
        </div>
        <div class="flex gap-x-2">
          <UIcon
            v-if="!disabled"
            name="i-lucide-trash-2"
            class="cursor-pointer text-lg text-primary"
            @click="delDocument(doc)"
          />
          <UIcon
            name="i-lucide-download"
            class="cursor-pointer text-lg text-primary"
            @click="downloadDocument(doc)"
          />
        </div>
      </div>
    </div>

    <!-- 上传组件 -->
    <div
      v-if="canAddMore"
      class="add-card box-content h-22 w-48 rounded-lg border border-solid border-gray-200 p-4 relative"
      :class="{ 'pointer-events-none opacity-80': isLoading }"
    >
      <UFileUpload
        v-model="uploadPdfFiles"
        accept="application/pdf"
        multiple
        variant="area"
        :preview="false"
        label="Upload PDF"
        description="PDF only, max 50MB"
        icon="i-lucide-upload"
        :disabled="isLoading"
        class="h-full w-full"
        @update:model-value="uploadPdf"
      >
        <template #default="{ open }">
          <div
            v-if="isLoading"
            class="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-primary"
          >
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
            <div class="text-sm">Loading...</div>
          </div>
          <div
            v-else
            class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-center text-primary"
            @click="open()"
          >
            <UIcon name="i-lucide-upload" class="text-2xl text-primary" size="2rem" />
            <div class="text-sm text-primary">Upload PDF</div>
            <div class="text-xs leading-normal text-gray-400">PDF only, max 50MB</div>
          </div>
        </template>
      </UFileUpload>
    </div>
  </div>
</template>

<style scoped lang="css">
.add-card {
  &[disabled="true"] {
    opacity: 0.8;
    pointer-events: none;
  }
}
</style>
