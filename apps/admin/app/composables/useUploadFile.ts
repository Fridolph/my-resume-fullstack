import { FileApi } from "~/apis/files";

interface UploadFileOptions {
  maxFileSize?: number;
  accept?: string[];
  apiContentType?: number;
  onSuccess?: (files: any[]) => void;
  onError?: (error: any) => void;
}

/**
 * @deprecated 遗留上传逻辑，仅用于现有 `UploadCell` / `UploadProd` / `UploadPDF`。
 * 新代码请使用 `useFileUploader`。
 */
export function useUploadFile(options: UploadFileOptions = {}) {
  const {
    maxFileSize = 50 * 1024 * 1024, // 默认50MB
    accept = ["*"],
    apiContentType = 0,
    onSuccess,
    onError,
  } = options;

  const toast = useToast();

  const loading = ref(false);
  const error = ref<any | null>(null);
  const files = ref<any[]>([]);

  /** 验证单个文件 */
  function validateFile(file: File, index: number): boolean {
    // 检查文件大小
    if (file.size > maxFileSize) {
      toast.add({
        title: "Error",
        description: "File exceeds the size limit",
        color: "error",
      });
      error.value = new Error(`File ${index + 1} exceeds size limit`);
      return false;
    }

    // 检查文件类型
    if (accept.length > 0 && accept[0] !== "*") {
      const fileType = (file.type || "") as string;
      const isValidType = accept.some((type) => {
        if (type.endsWith("/*")) {
          const baseType = type.split("/")[0] || "";
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });

      if (!isValidType) {
        toast.add({
          title: "Error",
          description: "Unsupported file type",
          color: "error",
        });
        error.value = new Error(`File ${index + 1} type not allowed`);
        return false;
      }
    }

    return true;
  }

  /** 处理文件选择 - 支持 FileList、单个 File 或 File[] 数组 */
  async function handleFileSelect(
    input: FileList | File | File[] | null,
    onUpload?: (formData: FormData) => Promise<any>,
  ): Promise<any[] | null> {
    let filesToProcess: File[] = [];

    if (!input) {
      toast.add({ title: "Error", description: "Please select a file", color: "error" });
      return null;
    }

    if (input instanceof File) {
      filesToProcess = [input];
    } else if (Array.isArray(input)) {
      filesToProcess = input;
    } else if (input instanceof FileList) {
      filesToProcess = Array.from(input);
    } else {
      toast.add({ title: "Error", description: "Please select a file", color: "error" });
      return null;
    }

    if (filesToProcess.length === 0) {
      toast.add({ title: "Error", description: "Please select a file", color: "error" });
      return null;
    }

    // 验证所有文件
    const filesToUpload: File[] = [];
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      if (file && validateFile(file, i)) {
        filesToUpload.push(file);
      } else {
        return null;
      }
    }

    if (filesToUpload.length === 0) {
      return null;
    }

    // 构建 FormData
    const formData = new FormData();
    filesToUpload.forEach((file) => {
      formData.append("files", file);
    });

    // 上传文件
    loading.value = true;
    error.value = null;

    try {
      let result: any[];

      if (onUpload) {
        result = await onUpload(formData);
      } else {
        result = await FileApi.uploadFile(formData, { contentType: apiContentType });
      }

      files.value = result;
      onSuccess?.(result);
      return result;
    } catch (err: any) {
      error.value = err;
      const errorMsg = err?.data?.msg || err?.message || "Upload failed";
      toast.add({
        title: "Error",
        description: errorMsg,
        color: "error",
      });
      onError?.(err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /** 重置状态 */
  function reset() {
    loading.value = false;
    error.value = null;
    files.value = [];
  }

  /** 清空错误 */
  function clearError() {
    error.value = null;
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    files: readonly(files),
    validateFile,
    handleFileSelect,
    reset,
    clearError,
  };
}
