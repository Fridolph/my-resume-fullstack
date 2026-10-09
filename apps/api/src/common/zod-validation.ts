import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common'
import { API_ERROR_CODES } from './error-codes'

/**
 * 全局的 Standard Schema 校验管道（Nest 12 内建，见 `@nestjs/common/pipes/standard-schema-validation.pipe`）。
 *
 * ## 为什么从 class-validator 换到 Standard Schema（Zod）
 *
 * 不是为了"新"，而是三条实际收益：
 * 1. **单一真源**：Zod schema 用 `z.infer` 直接推出 TS 类型；class-validator 是"装饰器 + 另一份
 *    手写类型"，两处一旦不同步就是**静默漂移**；
 * 2. **可共享**：schema 是纯值，前端将来要复用同一份规则（表单校验 + 类型）时可以直接引用；
 * 3. **无隐式转换**：不再依赖 `class-transformer` 的隐式类型转换（`"1"` → `1` 的时机是常见坑源）。
 *
 * ## 它为什么能替掉 `ValidationPipe({ whitelist: true })`
 *
 * `whitelist` 的作用是丢掉 DTO 未声明的字段，防止请求夹带 `permissionKeys` 之类混进业务。
 * Zod 的 `z.object()` **默认就是 strip** —— 行为等价，且规则写在 schema 里更直观。
 *
 * ## `exceptionFactory`：把校验失败接进项目统一错误体
 *
 * 默认实现抛的是 `BadRequestException(string[])`，没有 `errorCode`；这里改成带
 * `Common.Validation:failed` 的异常 —— 前端依然按 `errorCode` 分支，不解析文案。
 */
export function createSchemaValidationPipe() {
  return new StandardSchemaValidationPipe({
    // 校验后返回 schema 的转换结果（Zod 的 coerce / 默认值在此生效）
    transform: true,
    exceptionFactory: issues => {
      const messages = issues.map(issue => {
        const path = issue.path
          ?.map(segment => String(typeof segment === 'object' && segment !== null ? segment.key : segment))
          .join('.')
        return path ? `${path}: ${issue.message}` : issue.message
      })

      return new BadRequestException(messages[0] ?? '请求参数不合法', {
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
      })
    },
  })
}
