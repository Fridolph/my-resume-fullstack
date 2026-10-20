<script setup lang="ts" generic="T">
/**
 * 列表页的通用表格：`UTable` + **服务端分页** + 空态/加载态 + **工具栏插槽** + **可排序表头**。
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
 *
 * ## 搜索/筛选/视图切换一律归调用方，组件只管表格本身
 *
 * ⚠️ **曾经有过 `#toolbar` 插槽，已经删掉**：把它放在组件里，会诱导调用方把搜索框
 * 塞进"表格"这一个分支里 —— 而同一个页面还有**卡片视图**，结果就是"切到卡片后搜索消失"。
 * 搜索是**与视图无关的查询行为**，必须待在视图分支**之上**。
 * 组件只保留三件事：表格、服务端分页、可排序表头（"哪些列可排"由调用方的
 * `meta.sortable` 声明 —— 组件仍不认识业务字段）。
 * - 排序**状态**（`sort` / `order`）由调用方持有并通过 `v-model` 式事件回写：
 *   排序改变了查询条件，必须由调用方重新请求，组件自己不取数。
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
    /** 当前排序字段（对应列的 `accessorKey` / `id`）；不传 = 不启用排序表头 */
    sort?: string
    /** 当前排序方向 */
    order?: 'asc' | 'desc'
    /**
     * 每页条数的可选项。`showPageSize` 为 true 时才渲染选择器。
     *
     * 用开关而不是"有没有传 options"来判断：否则审计页会凭空多出一个它没接的选择器
     * （控件在，但点了没反应 —— 比没有更糟）。
     */
    pageSizeOptions?: number[]
    showPageSize?: boolean
  }>(),
  {
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    emptyText: '暂无数据',
    unit: '条记录',
    sort: undefined,
    order: 'desc',
    pageSizeOptions: () => [10, 20, 50, 100],
    showPageSize: false,
  },
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'update:sort': [sort: string]
  'update:order': [order: 'asc' | 'desc']
}>()

/** 列定义里我们真正会读的两个字段（其余原样交给 UTable） */
interface ColumnLike {
  accessorKey?: string
  id?: string
  header?: string
  meta?: { sortable?: boolean }
}

/**
 * 可排序的列 key —— 由调用方用 `meta.sortable: true` 声明。
 *
 * 组件**不认识** `name` / `updatedAt` 这些业务字段名，只认这个开关：
 * 以后换一张表、换一套列，这份代码不用改。
 */
const sortableKeys = computed(() =>
  (props.columns as ColumnLike[])
    .filter(column => column?.meta?.sortable === true)
    .map(column => column.accessorKey ?? column.id)
    .filter((key): key is string => typeof key === 'string'),
)

/**
 * 可排序列的遍历项：**插槽名预先算好**。
 *
 * ⚠️ Vue 的动态指令参数（`#[...]`）**不允许含空格** —— 写成 `#[key + '-header']`
 * 会在模板编译阶段直接报 "End bracket for dynamic directive argument was not found"，
 * 而且是**运行期 dev 才暴露**（`vue-tsc` 的类型检查不报这个）。
 * 所以这里把插槽名提前拼成属性，模板里只写 `#[item.slot]`（无空格）。
 */
const sortableColumns = computed(() => sortableKeys.value.map(key => ({ key, slot: `${key}-header` })))

/**
 * 点击表头切换排序。
 *
 * 同一列再点一次**翻转方向**；换一列则回到 `desc` ——
 * 列表场景里"最新/最大在前"是更常见的默认意图，用户不必每次点两下。
 */
function toggleSort(key: string): void {
  if (props.sort === key) {
    emit('update:order', props.order === 'desc' ? 'asc' : 'desc')
    return
  }
  emit('update:sort', key)
  emit('update:order', 'desc')
}

function indicatorFor(key: string): string {
  if (props.sort !== key) {
    return 'i-lucide-chevrons-up-down'
  }
  return props.order === 'desc' ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'
}

/**
 * 表头文案。
 *
 * 动态表头插槽（`#[key + '-header']`）**不接** `UTable` 给的 props：
 * 插槽名是运行期拼的，`UTable` 的泛型索引不到它，`slotProps.column` 在类型上不存在
 * （模板里会报"属性不存在"）。既然 key 是我们自己遍历出来的，直接从 `columns` 里反查更稳。
 */
function headerLabel(key: string): string {
  const column = (props.columns as ColumnLike[]).find(item => (item.accessorKey ?? item.id) === key)
  return column?.header ?? key
}

/** 给读屏软件的状态，而不是只靠一个箭头图标传达 */
function ariaSortFor(key: string): 'ascending' | 'descending' | 'none' {
  if (props.sort !== key) {
    return 'none'
  }
  return props.order === 'desc' ? 'descending' : 'ascending'
}
</script>

<template>
  <div>
    <UTable :data="data" :columns="columns as never[]" :loading="loading" :empty="loading ? '加载中…' : emptyText">
      <!-- 可排序表头：只为声明了 `meta.sortable` 的列生成，其余列用 UTable 的默认表头 -->
      <template v-for="item in sortableColumns" :key="item.key" #[item.slot]>
        <button
          type="button"
          class="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-highlighted"
          :aria-sort="ariaSortFor(item.key)"
          @click="toggleSort(item.key)"
        >
          {{ headerLabel(item.key) }}
          <UIcon :name="indicatorFor(item.key)" class="size-4 shrink-0 text-muted" />
        </button>
      </template>

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
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm text-muted">共 {{ total }} {{ unit }}</p>
        <!-- 每页条数：由调用方决定要不要，以及可选哪些（组件不猜） -->
        <template v-if="showPageSize">
          <USelect
            :model-value="pageSize"
            :items="pageSizeOptions"
            size="sm"
            class="w-20"
            aria-label="每页条数"
            @update:model-value="emit('update:pageSize', Number($event))"
          />
          <span class="text-sm text-muted">条/页</span>
        </template>
      </div>

      <!--
        分页器**始终展示**（Owner 2026-10-19）：即使只有一页也要在 ——
        否则"还有没有更多"只能靠数格子猜，数据跨过一页时控件又突然冒出来。
      -->
      <UPagination :page="page" :items-per-page="pageSize" :total="total" @update:page="emit('update:page', $event)" />
    </div>
  </div>
</template>
