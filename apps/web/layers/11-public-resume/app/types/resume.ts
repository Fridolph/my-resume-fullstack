/**
 * ⚠️ 这些展示域类型已上提到 **`@rs/common`**（DAO-034），本文件只是**转发层**。
 *
 * 保留它，是为了让 web 内部既有的 43 处引用（`#layers/public-resume/app/types/resume`）
 * 一行都不用改 —— 上提的目标是"两端复用同一份定义"，不是"顺手重排所有 import"。
 * 新代码请直接从 `@rs/common` 引入；这层转发在后续清理时删除。
 */
export type * from '@rs/common'
