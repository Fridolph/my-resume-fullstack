/**
 * schema 驱动表单的**数据描述**（与框架无关，web 与 admin 共用）。
 *
 * 这里只有"要渲染哪些字段、字段怎么取值"的描述，不含任何 Vue 代码 ——
 * 所以按 `@rs/common` 的判据（能脱离 Vue 运行 → 放这里）落在此处。
 * 真正的渲染组件是 `packages/ui` 的 `MySchemaForm` / `MySchemaFieldInput`。
 *
 * ⚠️ 各端可以有自己的字段表（如 web 面向 `ResumeContent`、admin 面向创建输入），
 * 但都编排成这两个类型描述的「段」，从而复用同一套渲染与增删/上下移逻辑。
 */

/** 单个字段的输入控件类型 */
export type FormFieldType = 'text' | 'textarea' | 'tags' | 'number'

export interface FormFieldSchema {
  /** `fields` 模式：相对根对象的路径，如 `profile.name` / `profile.hero.slogans` */
  path?: string
  /** `list` 模式：数组项上的字段名 */
  key?: string
  label: string
  type: FormFieldType
  /** 占整行（长文本、标签数组用） */
  wide?: boolean
  placeholder?: string
}

/** 编辑表单的一段 */
export interface FormSegmentSchema {
  /** `fields`：直接编辑若干字段；`list`：编辑某个数组 */
  mode: 'fields' | 'list'
  /** 段标题；也可以省略 */
  label?: string
  /** `list` 模式下数组路径，**支持点号**（如 `profile.links`） */
  listPath?: string
  /** `list` 模式下用哪个字段做项标题 */
  titleKey?: string
  /** `list` 模式下新增项的模板 */
  blank?: Record<string, unknown>
  fields: FormFieldSchema[]
}
