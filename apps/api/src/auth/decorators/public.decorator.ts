import { SetMetadata } from '@nestjs/common'

/** 元数据键：`JwtAuthGuard` 用 `Reflector` 读它来决定是否跳过鉴权 */
export const IS_PUBLIC_KEY = 'isPublic'

/**
 * 把路由（或整个控制器）标为**公开**。
 *
 * 因为 `JwtAuthGuard` 是全局守卫、**默认保护所有路由**，所以这里只做"显式开放"。
 * 漏标一个接口的后果是"需要登录"（安全的那一侧）；反过来做的话，漏标就是权限漏洞。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
