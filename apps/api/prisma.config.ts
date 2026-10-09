import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * Prisma CLI 的配置 —— **只被 CLI 使用**（`migrate` / `db push` / `studio` / `generate`），
 * 运行时的连接由 `PrismaClient` 的 driver adapter 负责，两者互不相干。
 *
 * ## 为什么要单独一个文件
 *
 * Prisma 7 把连接串从 `schema.prisma` 的 `datasource.url` 移到了这里，于是：
 * - `schema.prisma` 只描述**结构**（表、字段、关系）→ 它才是"数据库结构的唯一真源"；
 * - 连接信息属于**环境配置**，跟迁移、studio 这些 CLI 行为放在一起更合理。
 *
 * 代价是连接串要写两处（这里给 CLI、adapter 给运行时），这是 v7 的**有意设计**，不是重复配置。
 *
 * ## 为什么用 `process.env` 而不是 `env()` 助手
 *
 * `env('DATABASE_URL')` 在变量缺失时**直接抛错**；而 `prisma generate` 只读 schema、
 * 根本不需要连库 —— 不该因为本机没配库就连类型都生成不出来。
 * 真正需要连库的命令（`migrate` / `studio`）在缺变量时自然会失败，那时报错也更有针对性。
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // seed 由代码里的权限键定义驱动（见 prisma/seed.ts 的说明），可反复执行
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
