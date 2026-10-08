<script lang="ts" setup>
import type { VNode } from "vue";
import { cloneVNode, Comment, Fragment, Text } from "vue";

/**
 * DocVnode —— PdfDocument 的「渲染阶段确定性页码」版本。
 *
 * 直接在渲染时遍历默认插槽的 vnode，按文档顺序给内容页 PdfPage 注入
 * page / total-pages。页码在 SSR 阶段就已写入 HTML，不依赖客户端 onMounted，
 * 无头浏览器无论何时截取都能拿到页码（PdfPage 中 props 优先级高于自动计算）。
 */
interface Props {
  /** 是否将封面排除在总页数之外，页码从非封面页开始 */
  excludeCover?: boolean;
}

const { excludeCover = true } = defineProps<Props>();

const slots = useSlots();

const { totalPages } = providePdfDocument({ excludeCover: () => excludeCover });

const { hasDocument, ready } = usePdfRenderState();

function isPageComponent(type: any, name: "PdfPage" | "PdfCover") {
  return type?.__name === name || type?.name === name;
}

function isCoverVNode(vnode: VNode) {
  if (isPageComponent(vnode.type, "PdfCover")) return true;
  const pageType = vnode.props?.pageType ?? vnode.props?.["page-type"];
  return isPageComponent(vnode.type, "PdfPage") && pageType === "cover";
}

function isPageVNode(vnode: VNode) {
  return isPageComponent(vnode.type, "PdfPage") || isPageComponent(vnode.type, "PdfCover");
}

// 展开 v-for / template 产生的 Fragment、跳过注释与文本节点
function flattenNodes(children: any[], out: VNode[] = []): VNode[] {
  for (const child of children) {
    if (child == null || typeof child !== "object") continue;
    if (Array.isArray(child)) {
      flattenNodes(child, out);
      continue;
    }
    const vnode = child as VNode;
    if (vnode.type === Comment || vnode.type === Text) continue;
    if (vnode.type === Fragment) {
      flattenNodes((vnode.children as any[]) ?? [], out);
      continue;
    }
    out.push(vnode);
  }
  return out;
}

function renderNumberedPages() {
  const nodes = flattenNodes((slots.default?.() ?? []) as any[]);
  const counted = nodes.filter((n) => isPageVNode(n) && !(excludeCover && isCoverVNode(n)));
  const total = counted.length;

  let counter = 0;
  return nodes.map((node) => {
    if (!isPageVNode(node)) return node;
    if (excludeCover && isCoverVNode(node)) return node;

    counter += 1;

    // 仅内容页 PdfPage 需要展示页码；封面由 PdfCover 自行处理、不显示页码
    if (!isPageComponent(node.type, "PdfPage")) return node;

    const hasPage = node.props?.page != null;
    const hasTotal = node.props?.totalPages != null || node.props?.["total-pages"] != null;
    if (hasPage && hasTotal) return node;

    const currentPage = counter;
    return cloneVNode(node, {
      ...(hasPage ? {} : { page: currentPage }),
      ...(hasTotal ? {} : { totalPages: total }),
    });
  });
}

// 稳定的函数式组件：在 DocVnode 每次渲染时重新计算页码
const NumberedPages = () => renderNumberedPages();

// setup 阶段（SSR + 客户端）即标记本页包含页码，供 pdf 布局的就绪锚点判断。
hasDocument.value = true;
ready.value = false;

onMounted(async () => {
  await nextTick();
  ready.value = true;
});

onBeforeUnmount(() => {
  ready.value = false;
  hasDocument.value = false;
});

defineExpose({ totalPages });
</script>

<template>
  <div class="pdf-document">
    <component :is="NumberedPages" />
  </div>
</template>
