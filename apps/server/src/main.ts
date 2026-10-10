import { ConfigService } from '@nestjs/config'
import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { API_ERROR_CODES } from './common/error-codes'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // 统一从 ConfigService 读配置（已过 `config/env.validation.ts` 的校验），
  // 避免各处直接摸 process.env —— 那样校验形同虚设
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')

  // ⚠️ 当前允许任意来源跨域，便于本地前端联调。上线前要收紧为白名单
  // （`origin: [web, admin 的域名]`），否则任何站点都能直接调这套接口
  app.enableCors()

  // 入参校验：Nest 12 的 Standard Schema 管道（schema 挂在 `@Body({ schema })` 上）。
  // 用它而不是 class-validator：校验规则与 TS 类型同源（`z.infer`），且 `z.object()` 默认 strip
  // 未声明字段（等价于旧 `ValidationPipe({ whitelist: true })` 的防注入）。
  // 详细约定见 docs/server/01_API_约定.md §3.1。
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      // 校验后返回 schema 的转换结果（Zod 的 coerce / 默认值在此生效）
      transform: true,
      // 默认实现抛的是 BadRequestException(string[])、不带 errorCode；
      // 这里给一个带项目错误码的异常，前端仍然按 errorCode 分支
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
    }),
  )

  await app.listen(config.get<number>('PORT') ?? 4049, '0.0.0.0')
}

void bootstrap()
