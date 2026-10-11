# user 模块业务讨论

本目录按“业务讨论 → 伪代码 → 确认 → 实装”推进，通用模块规范见 [NestJS 模块开发模板](../../../../docs/server/03_NestJS_模块开发模板.md)。

当前已写入超管创号、用户名/邮箱登录、资料修改、密码修改、会话强制下线与软删除，未由 AI 运行验证；列表、详情仍为学习模板。当前契约、迁移与 Apifox 步骤见 [账号创建与登录](../../../../docs/server/04_账号创建与登录_业务讨论.md) 和 [后端开发与接口交付流程](../../../../docs/server/08_后端开发与接口交付流程.md)，资料修改、密码和删除的权限、伪代码及人工验证清单见 [用户修改与删除](../../../../docs/server/05_用户修改与删除_业务讨论.md)，早期学习记录见 [用户模块业务讨论](../../../../docs/server/02_用户模块_业务讨论模板.md)。

## 路由

| 方法 | 路径 | 用例 |
| --- | --- | --- |
| `GET` | `/user` | 查询用户列表 |
| `GET` | `/user/:id` | 查询单个用户 |
| `POST` | `/user` | 创建用户 |
| `PATCH` | `/user/:id` | 修改用户 |
| `PATCH` | `/user/:id/password` | 本人修改密码并撤销旧会话 |
| `POST` | `/user/:id/force-logout` | 超管撤销 user/admin 的现有会话 |
| `DELETE` | `/user/:id` | 删除用户 |

## 分层

```text
UserController → UserService → PrismaService

当查询复杂、跨用例复用或需要隔离持久化实现时，再增加 Repository。
```

- Controller：路由、参数、DTO、调用 service。
- Guard：检查当前用户的创建权限。
- Service：业务规则、密码哈希与错误语义。
- Repository（可选）：复杂查询、复用查询或持久化隔离。
- DTO：输入形状与基础校验。

## 分页候选

列表接口建议先采用 offset 分页，并抽成共享纯 TS 契约：

```ts
type PageQuery = { page: number; pageSize: number }
type PageMeta = { page: number; pageSize: number; total: number; totalPages: number }
type PageResult<T> = { items: T[]; meta: PageMeta }
```

最终是否放入 `packages/common`，等第二个分页接口出现后再确认，避免过早抽象。

## 创建规则

- 已确认拆分 `super_admin / admin / user`；仅超级管理员可创建用户。
- 创建请求的 `roleKey` 可选 `admin/user`，默认 `user`；不开放创建超级管理员。
- username/email 至少一个；username 为 3–32 个中文、字母、数字或下划线，统一转小写；email trim 后转小写且唯一。
- nickname 为可修改昵称，创建时可选；未设置时展示回退到 username 或 email；修改接口后续实现。
- id 使用系统生成的 cuid；phone 不参与当前接口，displayName 已改为 nickname。
- password 为 6–20 字符且不 trim；avatar 可选，为最多 2048 字符的 HTTP(S) URL，未传为 null。
- 创建用户与角色关联使用 Prisma nested write；唯一约束冲突由全局 Filter 返回通用 409，角色未初始化由 Service 返回 400。
- 第三方账号未来放独立身份关联表，本轮只保存用户基础资料。
- 登录与受保护请求身份恢复已接数据库；seed 初始化 username=super、email=super@q.com 超管（初始学习密码 super!），重复执行不重置密码，需 Owner 执行。
 
## 后续讨论

- PATCH 只修改 nickname/avatar；未传保持原值，null 清空，至少传一个字段。
- user/admin 仅能修改本人；修改他人须具有 super_admin 角色与 Settings.Users:edit 权限。旧 admin 即使持有 edit 权限也不能越权。
- username、email、roleKey、password 不允许通过资料接口修改；响应仅选安全字段。
- 删除只更新 `deletedAt`，保留角色关联和 username/email 唯一值；仅超管可删除 user/admin，不能删除自己或任何超管。

- 软删除已实现；禁止删除自己及任何超管，重复删除返回 404，并发状态变化返回 409。
- 邮箱删除后仍占用唯一值；恢复、换邮箱与归属验证另行设计。
- 密码修改已确认使用独立接口；字段与权限另行讨论。
- 密码修改和强制下线已实现 `sessionVersion` 版本撤销；迁移、generate 和 Apifox 验证由 Owner 执行。
