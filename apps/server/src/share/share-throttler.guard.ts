import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler'
import { API_ERROR_CODES } from '../common/error-codes'

/**
 * `/s/:token` 的限流守卫。
 *
 * ## 为什么公开读也必须限流
 *
 * token 是公开端点上**唯一的凭证**。不限流等于允许暴力枚举 —— 与登录暴力破解同一个道理，
 * 只是被猜的是链接而不是密码。
 *
 * ## 阈值为什么比登录宽松
 *
 * 登录是"人手动尝试"（5 次/分钟够用），而分享链接是"打开一个页面"：
 * 一次可能伴随多个子请求（页面本身、PDF 下载）。所以给到 **60 次/分钟**，
 * 既能挡住枚举（真枚举要成千上万次），又不会误伤正常浏览。
 *
 * 与 `LoginThrottlerGuard` 分开而不是共用一个，是因为**错误码不同**：
 * 「有人在猜 token」与「有人在猜密码」的处置完全不同 —— 前者可以撤销链接，后者改密码才管用。
 */
@Injectable()
export class ShareThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        message: '访问过于频繁，请稍后再试',
        errorCode: API_ERROR_CODES.SHARE_RATE_LIMITED,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
}
