import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { createSchemaValidationPipe } from './common/zod-validation'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // 统一从 ConfigService 读配置（已过 `config/env.validation.ts` 的校验），
  // 避免各处直接摸 process.env —— 那样校验形同虚设
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')

  // ⚠️ 当前允许任意来源跨域，便于本地前端联调。上线前要收紧为白名单
  // （`origin: [web, admin 的域名]`），否则任何站点都能直接调这套接口
  app.enableCors()

  // 校验用 Standard Schema（Zod）而不是 class-validator：
  // 校验规则与 TS 类型同源（z.infer），且失败会带上项目约定的 errorCode
  app.useGlobalPipes(createSchemaValidationPipe())

  await app.listen(config.get<number>('PORT') ?? 4049, '0.0.0.0')
}

void bootstrap()
