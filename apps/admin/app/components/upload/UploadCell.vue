<script setup lang="ts">
import { FileApi } from "~/apis/files";
import { useUploadFile } from "~/composables/useUploadFile";

// 单张图片上传，支持数据类型：字符串或数组
const props = withDefaults(
  defineProps<{
    modelValue: Record<string, any>[] | string | null | undefined;
    tip?: string;
    maxFileSize?: number;
  }>(),
  {
    maxFileSize: 1024 * 1024 * 2,
  },
);
const emits = defineEmits(["update:modelValue"]);

const defaultTip = "JPG / PNG, max 2MB";

const uploadFile = ref<File | null>(null);

const { loading, handleFileSelect } = useUploadFile({
  maxFileSize: props.maxFileSize,
  accept: ["image/*"],
});

watch(
  () => props.modelValue,
  (val: any) => {
    if (typeof val === "string" && val !== "") {
      return emits("update:modelValue", [
        {
          originalFilePath: val,
        },
      ]);
    }
  },
  {
    immediate: true,
    once: true,
    deep: true,
  },
);

async function onFileSelect(file: File | null | undefined) {
  if (!file) {
    return;
  }

  const res = await handleFileSelect(file, async (formData: FormData) => {
    return FileApi.uploadFile(formData);
  });

  if (res) {
    emits("update:modelValue", res);
    uploadFile.value = null;
  }
}
</script>

<template>
  <div>
    <!-- Display image -->
    <template v-if="modelValue && Array.isArray(modelValue) && modelValue.length">
      <div
        class="flex h-full w-full flex-col items-center justify-center rounded-lg border border-gray-200"
      >
        <div
          v-for="file in modelValue"
          :key="file.originalFilePath"
          class="imgWrap relative m-auto h-full w-full p-2"
        >
          <img
            :src="file.originalFilePath"
            onload="this.style.opacity = 1;"
            style="opacity: 0; transition: opacity 0.2s"
            alt="logo"
            class="m-auto h-full w-full object-contain"
          />
          <div
            v-if="!$attrs.disabled"
            class="cancelIcon absolute -right-1 -top-1 flex h-4 w-4 cursor-pointer rounded-full bg-gray-900 text-white"
          >
            <UIcon name="i-lucide-x" class="m-auto" @click="emits('update:modelValue', null)" />
          </div>
        </div>
      </div>
    </template>

    <!-- FileUpload component -->
    <UFileUpload
      v-else
      v-model="uploadFile"
      accept="image/*"
      variant="area"
      label="Upload image"
      :description="tip || defaultTip"
      icon="i-lucide-upload"
      class="h-full w-full rounded-lg border border-gray-200"
      @update:model-value="onFileSelect"
    >
      <template #default="{ open }">
        <div
          v-if="loading"
          class="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-primary"
        >
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
          <div class="text-sm">Loading...</div>
        </div>
        <div
          v-else
          class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 p-4 text-center text-primary"
          @click="open()"
        >
          <UIcon name="i-lucide-upload" class="text-2xl text-primary" />
          <div class="text-sm text-primary">Upload image</div>
          <div class="text-xs leading-normal text-gray-400">
            {{ tip || defaultTip }}
          </div>
        </div>
      </template>
    </UFileUpload>
  </div>
</template>
