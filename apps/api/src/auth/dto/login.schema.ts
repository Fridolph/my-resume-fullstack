import { z } from 'zod'

/**
 * 登录取参 schema。
 *
 * ## 为什么是 schema 而不是 class
 *
 * - **单一真源**：下面的 `LoginInput` 由 `z.infer` 推出，**不可能**与校验规则脱节。
 *   换成 class-validator 就要维护"装饰器 + 另一份 TS 类型"，改一处忘另一处就是漂移 ——
 *   参考项目 `common/` 里六份响应定义并存，就是同一种成因。
 * - **可共享**：schema 是纯值，将来前端要做表单校验与类型推导，把它移到 `packages/common`
 *   即可复刻同一份规则。
 *   ⚠️ 现在留在 `apps/api` 是**有意的**：`packages/common` 是 ESM 而 API 编译为 CJS，
 *   跨用要处理模块格式，等真要共享时一并解决（不该为了"以后可能"先把构建搞复杂）。
 *
 * ## 约束的取舍
 *
 * 取"能明确拒绝明显错误"的最小集：上限防止超长输入直接打进哈希/查库，
 * 下限挡掉空密码这类无效请求。这里**不**做"用户名只能是字母数字"这类业务规则 ——
 * 那属于领域约束，等有真实用户体系时在 service/domain 层表达。
 */
export const loginSchema = z.object({
  // `{ error }` 是 Zod 4 的写法（统一了 v3 的 `required_error` / `invalid_type_error`）：
  // 缺字段、类型不对、以及下面的长度约束，都走同一条文案出口
  username: z.string({ error: '用户名必须是字符串' }).trim().min(1, '用户名不能为空').max(32, '用户名过长'),
  password: z.string({ error: '密码必须是字符串' }).min(4, '密码至少 4 位').max(64, '密码过长'),
})

/** 控制器入参类型：**由 schema 推出**，不手写 */
export type LoginInput = z.infer<typeof loginSchema>
