import { Body, Controller, Get, Param, Patch } from '@nestjs/common'
import { resumePdfConfigUpdateSchema, resumePrimaryKeySchema, type ResumePdfConfigUpdateDto } from '@rs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { AuthUser } from '../common/http-context'
import { ResumePdfConfigService } from './resume-pdf-config.service'

/** 配置独立写路径；所有接口均要求真实登录，不接受客户端所有权字段。 */
@Controller('resume')
export class ResumePdfConfigController {
  constructor(private readonly configs: ResumePdfConfigService) {}

  /** 读取当前用户的跨简历预设。 */
  @Get('pdf-preset')
  getPreset(@CurrentUser() user: AuthUser) {
    return this.configs.getPreset(user)
  }

  /** 保存预设不会改变已保存的简历配置。 */
  @Patch('pdf-preset')
  savePreset(
    @Body({ schema: resumePdfConfigUpdateSchema }) input: ResumePdfConfigUpdateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.configs.savePreset(input, user)
  }

  /** 只读本人配置，用于识别公开页是否具有保存资格。 */
  @Get(':id/pdf-config')
  getConfig(@Param('id', { schema: resumePrimaryKeySchema }) id: number, @CurrentUser() user: AuthUser) {
    return this.configs.getConfig(id, user)
  }

  /** expectedConfig 冲突由服务端明确返回409，不自动覆盖。 */
  @Patch(':id/pdf-config')
  saveConfig(
    @Param('id', { schema: resumePrimaryKeySchema }) id: number,
    @Body({ schema: resumePdfConfigUpdateSchema }) input: ResumePdfConfigUpdateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.configs.saveConfig(id, input, user)
  }
}
