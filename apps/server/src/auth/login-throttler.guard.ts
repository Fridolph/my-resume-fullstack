import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler'
import { API_ERROR_CODES } from '../common/error-codes'

/**
 * 只用于**登录**的限流守卫。
 *
 * ## 为什么继承 `ThrottlerGuard` 而不是直接用它
 *
 * 原生 `ThrottlerGuard` 抛的是 `ThrottlerException`，**响应体里没有 `errorCode`**。
 * 本仓的错误契约要求前端永远能拿到稳定的 `errorCode`（见 `common/error-codes.ts` 里
 * `inferErrorCode` 的兜底理由）——没有码时前端只能按状态码猜，而 429 在兜底表里
 * 会落到 `Common.Internal:error`：那会让"你试得太快了"显示成"服务器内部错误"，
 * 属于**误导性的错误信息**，比不提示更糟。
 *
 * 所以这里覆写抛出点，显式带上 `AUTH.Login:throttled`。
 *
 * ## 为什么只挂在登录路由上（见 `auth.controller.ts` 的 `@UseGuards`）
 *
 * **刻意不做全局限流**：全局限制会顺带节流"公开简历页读取"和前端轮询，
 * 那是另一个产品决策（防 DoS），与"防密码爆破"不是同一件事。本轮只收 auth 面。
 *
 * 而"防爆破"之所以必须做：`auth.service.login()` 里有一次 `verifyPassword`（bcrypt，
 * CPU 密集）。不限流意味着攻击者可以无限次尝试，**每次都在服务端跑一次密码哈希** ——
 * 既是密码爆破通道，也是一条廉价的 CPU 打满路径。
 *
 * 守卫在 Controller **之前**执行，所以被限流的请求根本不会跑到 `verifyPassword`，
 * CPU 保护才成立。
 *
 * ## 已知限制（不要以为它解决了更多）
 *
 * - **内存存储 → 只对单实例有效**。多实例部署时每个实例各有一份计数，实际额度被放大。
 *   要跨实例需接 Redis storage（本仓 `compose.yaml` 与依赖里**都没有 Redis**）。
 * - **按 IP 计数**：同一出口（NAT / 办公室）共享额度；换 IP 即可绕过。
 * - **反向代理后 `req.ip` 是代理地址**，需 Express 的 `trust proxy` 才是真实客户端 IP。
 *   没配时这条限流会退化成"全站共享一份额度" —— 部署到反代之后必须补。
 * - 不防"低频撞库"（每分钟 4 次、持续数天）：那需要账号锁定或异常检测，属产品决策。
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  /**
   * 覆写限流抛出点：把 429 换成带稳定 `errorCode` 的响应体。
   *
   * 不覆写 `getErrorMessage` 而是覆写这里 —— 前者只管文案，管不到 `errorCode`；
   * 而前端要区分"被限流"与"服务出错"，靠的正是那个码。
   */
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        message: '登录尝试过于频繁，请稍后再试',
        errorCode: API_ERROR_CODES.AUTH_LOGIN_THROTTLED,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
}
