import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from "vue";

export type PdfPageType = "cover" | "content";

interface PdfDocumentContext {
  register: (id: symbol, getType: () => PdfPageType) => void;
  unregister: (id: symbol) => void;
  getPageNumber: (id: symbol) => ComputedRef<number>;
  totalPages: ComputedRef<number>;
}

interface PdfDocumentOptions {
  /** 是否将封面排除在总页数之外，页码从非封面页开始（默认 false） */
  excludeCover?: MaybeRefOrGetter<boolean>;
}

export const PDF_DOCUMENT_KEY: InjectionKey<PdfDocumentContext> = Symbol("pdf-document");

/**
 * 在容器组件（PdfDocument）中调用：
 * 收集其下所有 PdfPage 的注册，统计总页数并按挂载顺序分配页码。
 * 可通过 excludeCover 控制封面是否计入总页数与页码。
 */
export function providePdfDocument(options?: PdfDocumentOptions) {
  // 按注册（挂载）顺序保存每一页：唯一标识 + 页类型取值函数
  const entries = ref<{ id: symbol; getType: () => PdfPageType }[]>([]);

  const excludeCover = () => toValue(options?.excludeCover) ?? false;

  function register(id: symbol, getType: () => PdfPageType) {
    if (!entries.value.some((e) => e.id === id)) {
      entries.value.push({ id, getType });
    }
  }

  function unregister(id: symbol) {
    entries.value = entries.value.filter((e) => e.id !== id);
  }

  // 参与页码统计的页：排除封面时过滤掉 cover 类型
  const countedIds = computed(() =>
    entries.value.filter((e) => !(excludeCover() && e.getType() === "cover")).map((e) => e.id),
  );

  function getPageNumber(id: symbol) {
    return computed(() => {
      const idx = countedIds.value.indexOf(id);
      // 未参与统计（被排除的封面）返回 0
      return idx === -1 ? 0 : idx + 1;
    });
  }

  const totalPages = computed(() => countedIds.value.length);

  provide(PDF_DOCUMENT_KEY, { register, unregister, getPageNumber, totalPages });

  return { totalPages };
}

/**
 * PDF 渲染就绪状态：供 pdf 布局的「就绪锚点」判断无头浏览器截取 PDF 的时机。
 *
 * - hasDocument：当前页是否使用了 PdfDocument（即是否包含自动页码）。
 *   在 PdfDocument 的 setup 阶段同步置 true，SSR 与客户端都会生效。
 * - ready：页码等内容是否已真正渲染到 DOM。仅在客户端 onMounted + nextTick 后置 true。
 *
 * 含页码的页面必须等 ready 为 true，锚点才出现，确保页码一定已写入 DOM。
 */
export function usePdfRenderState() {
  const hasDocument = useState<boolean>("pdf-has-document", () => false);
  const ready = useState<boolean>("pdf-ready", () => false);
  return { hasDocument, ready };
}

/**
 * 在每个 PdfPage 中调用：
 * 向最近的 PdfDocument 注册自身，返回自动计算的页码与总页数。
 * 若外层没有 PdfDocument，则返回 0（此时可退回到手动传入的 props）。
 */
export function usePdfPage(getType: () => PdfPageType = () => "content") {
  const ctx = inject(PDF_DOCUMENT_KEY, null);

  if (!ctx) {
    return {
      pageNumber: computed(() => 0),
      totalPages: computed(() => 0),
      hasDocument: false,
    };
  }

  const id = Symbol("pdf-page");
  // 挂载顺序 = 文档顺序（子组件先于父组件挂载，同级从上到下）
  onMounted(() => ctx.register(id, getType));
  onBeforeUnmount(() => ctx.unregister(id));

  return {
    pageNumber: ctx.getPageNumber(id),
    totalPages: ctx.totalPages,
    hasDocument: true,
  };
}
