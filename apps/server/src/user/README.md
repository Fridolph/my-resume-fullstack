# user 模块业务讨论

本目录按“业务讨论 → 伪代码 → 确认 → 实装”推进，通用模块规范见 [NestJS 模块开发模板](../../../../docs/server/03_NestJS_模块开发模板.md)。

当前已写入超管创号与邮箱登录，未运行验证；列表、详情、修改、删除仍为学习模板。当前契约、迁移与 Apifox 步骤见 [账号创建与登录](../../../../docs/server/04_账号创建与登录_业务讨论.md)，早期学习记录见 [用户模块业务讨论](../../../../docs/server/02_用户模块_业务讨论模板.md)。

## 路由

| 方法 | 路径 | 用例 |
| --- | --- | --- |
| `GET` | `/user` | 查询用户列表 |
| `GET` | `/user/:id` | 查询单个用户 |
| `POST` | `/user` | 创建用户 |
| `PATCH` | `/user/:id` | 修改用户 |
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

- 软删除已确认；删除接口开工时确认是否禁止删除自己。
- 邮箱删除后仍占用唯一值；恢复、换邮箱与归属验证另行设计。
- 密码修改已确认使用独立接口；字段与权限另行讨论。
