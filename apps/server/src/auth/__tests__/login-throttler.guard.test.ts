import { HttpException, type ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { ThrottlerStorageService } from '@nestjs/throttler'
import { describe, expect, it } from 'vitest'
import { LoginThrottlerGuard } from '../login-throttler.guard'

/**
 * B3（登录限流）的行为测试 —— 走真实的 `ThrottlerStorageService`，不 mock 计数逻辑。
 *
 * 本仓没有 `@nestjs/testing` / `supertest`（见 `audit.controller.test.ts` 的写法），
 * 所以这里直接 `new` 守卫并喂一个假的 `ExecutionContext`。
 *
 * 钉住的是三条**行为契约**：
 *
 * 1. **额度内放行** —— 限流不能误伤正常登录；
 * 2. 超限时 **429 且响应体带 `AUTH.Login:throttled`** —— 没有这个码，
 *    `inferErrorCode` 会把 429 兜底成 `Common.Internal:error`，前端就把"试太快"
 *    显示成"服务器内部错误"（误导性信息比不提示更糟）；
 * 3. **按 IP 独立计数** —— 这条同时是"已知限制"的书面记录：一个 IP 用满不影响另一个，
 *    也就意味着换 IP 即可绕过。
 *
 * 会让它变红的改动：去掉 `ApiErrorCode` 的显式传递（退化成通用 429）、
 * 把 `getTracker` 改成不看请求（所有人共享一份额度）。
 */

interface GuardOptions {
  limit: number
  ttl: number
}

async function createGuard(options: GuardOptions): Promise<LoginThrottlerGuard> {
  const storage = new ThrottlerStorageService()
  // 守卫会通过 reflector 读路由上的 @Throttle / @SkipThrottle 元数据。
  // 测试里一律不给 → 让模块级配置（也就是传进来的 options）生效，正是线上登录路由的情形。
  const reflector = { getAllAndOverride: () => undefined, get: () => undefined } as unknown as Reflector

  const guard = new LoginThrottlerGuard([options], storage, reflector)
  // ⚠️ 必须显式跑一次 Nest 生命周期：`this.throttlers` 是在 `onModuleInit()` 里
  // 从 options 填充的，跳过它 `canActivate` 会抛 `this.throttlers is not iterable`。
  // 这是"没有 @nestjs/testing、直接 new 守卫"的直接代价 —— 写在注释里免得下一个人再踩。
  await guard.onModuleInit()
  return guard
}

/** 最小的 Express 请求 / 响应形状：`getTracker` 会读 `ips` 与 `ip` */
function createContext(ip: string): ExecutionContext {
  const request = { ip, ips: [] as string[], headers: {}, socket: { remoteAddress: ip } }
  const response = {
    header: () => response,
    setHeader: () => response,
    getHeader: () => undefined,
  }
  function loginHandler(): void {}
  function AuthController(): void {}

  return {
    getHandler: () => loginHandler,
    getClass: () => AuthController,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext
}

/** 取出抛出的错误（没抛就返回 undefined），避免依赖测试框架的 rejects 匹配器 */
async function catchError(guard: LoginThrottlerGuard, context: ExecutionContext): Promise<unknown> {
  try {
    await guard.canActivate(context)
    return undefined
  } catch (error) {
    return error
  }
}

describe('LoginThrottlerGuard', () => {
  it('额度内放行（限流不误伤正常登录）', async () => {
    const guard = await createGuard({ limit: 3, ttl: 60_000 })
    const context = createContext('203.0.113.1')

    await expect(guard.canActivate(context)).resolves.toBe(true)
    await expect(guard.canActivate(context)).resolves.toBe(true)
    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('超出额度 → 429，且响应体带 AUTH.Login:throttled', async () => {
    const guard = await createGuard({ limit: 1, ttl: 60_000 })
    const context = createContext('203.0.113.2')
    await expect(guard.canActivate(context)).resolves.toBe(true)

    const error = await catchError(guard, context)

    expect(error).toBeInstanceOf(HttpException)
    const httpError = error as HttpException
    expect(httpError.getStatus()).toBe(429)
    expect(httpError.getResponse()).toMatchObject({ errorCode: 'AUTH.Login:throttled' })
  })

  it('按 IP 独立计数：一个 IP 用满不影响另一个（也意味着换 IP 可绕过）', async () => {
    const guard = await createGuard({ limit: 1, ttl: 60_000 })
    const first = createContext('203.0.113.10')
    const second = createContext('203.0.113.11')

    await expect(guard.canActivate(first)).resolves.toBe(true)
    // 第二个 IP 仍有自己的额度
    await expect(guard.canActivate(second)).resolves.toBe(true)

    // 第一个 IP 已用满
    expect(await catchError(guard, first)).toBeInstanceOf(HttpException)
  })
})
