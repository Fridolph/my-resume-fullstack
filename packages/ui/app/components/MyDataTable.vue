<script setup lang="ts" generic="T">
/**
 * 列表页的通用表格：`UTable` + **服务端分页** + 空态/加载态。
 *
 * ## 为什么要抽它
 *
 * admin 里已经有两处"表格 + 页脚 + 共 N 条"的重复（简历列表、审计日志），
 * 再写第三处时这三件事一定会三份实现、三种外观。抽出来只保留一份。
 *
 * ## 为什么 columns / data 的类型是宽松的
 *
 * 这个组件在 `packages/ui`，**不能**用 `defineProps<外部类型>()` 指向 `@rs/common`
 * （SFC 编译器不展开包的 re-export 链，dev 会崩 —— `AGENTS.md` §4.6）。
 * 而 `@nuxt/ui` 的 `TableColumn<T>` 又不是本包的依赖。所以这里只声明**结构上有用到的那部分**，
 * 行数据交给调用方，单元格渲染由插槽负责。
 *
 * ## 插槽是**透传**的
 *
 * 调用方照常写 `<template #name-cell="{ row }">` —— 这里用 `v-for` 遍历 `$slots`
 * 逐个转给 `UTable`。不这么做的话，每加一列就要回来改这个组件，抽了等于没抽。
 *
 * ## 分页是"服务端分页"，不是前端切片
 *
 * `data` 只是**当前页**。所以组件必须知道 `total`（画"共 N 条"与页数），
 * 翻页通过 `update:page` 抛出去由调用方重新请求 —— 在前端切 `total` 会让页码与真实总数脱节。
 */

/**
 * `generic="T"` 是必需的：`UTable` 的单元格插槽按行类型推导，
 * 若这里把 `data` 写死成 `Record<string, unknown>[]`，调用方的
 * `#name-cell="{ row }"` 会拿到 `never`（类型检查直接报"属性不存在"）。
 */
const props = withDefaults(
  defineProps<{
    /** 当前页的数据（服务端分页） */
    data: T[]
    /**
     * 列定义。**类型故意宽松**：`@nuxt/ui` 的 `TableColumn<T>` 不是本包的依赖
     * （见文件头 §4.6 的说明），所以只要求"能被 UTable 用"，
     * 具体校验交给调用方自己的 `TableColumn<Row>[]`。
     */
    columns: unknown[]
    /** 总条数（服务端返回）；不传则视为不分页 */
    total?: number
    page?: number
    pageSize?: number
    loading?: boolean
    /** 空态文案 */
    emptyText?: string
    /** "共 N 条"里的量词 */
    unit?: string
  }>(),
  {
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    emptyText: '暂无数据',
    unit: '条记录',
  },
)

const emit = defineEmits<{ 'update:page': [page: number] }>()

const hasPagination = computed(() => props.total > props.pageSize)
</script>

<template>
  <div>
    <UTable :data="data" :columns="columns as never[]" :loading="loading" :empty="loading ? '加载中…' : emptyText">
      <!-- 透传调用方的单元格插槽（`#<key>-cell`） -->
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </UTable>

    <!--
      页脚与表格同属一块：`border-t` + 与表格一致的左右内边距，
      让"共 N 条 / 翻页"在视觉上属于这张表，而不是另一个区块。
    -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-4 py-3">
      <p class="text-sm text-muted">共 {{ total }} {{ unit }}</p>

      <UPagination
        v-if="hasPagination"
        :page="page"
        :items-per-page="pageSize"
        :total="total"
        @update:page="emit('update:page', $event)"
      />
    </div>
  </div>
</template>
