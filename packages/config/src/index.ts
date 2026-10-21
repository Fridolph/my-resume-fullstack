import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defu } from 'defu'
import { defineNuxtConfig } from 'nuxt/config'
import type { NuxtConfig } from 'nuxt/schema'
import { readGitCommit, readPackageVersion } from './node-env.js'
import { rsPagePrivateComponents } from './page-components.js'

/**
 * `apps/web` 与 `apps/admin` 共用的 Nuxt **构建基线**。
 *
 * ## 为什么需要它
 *
 * 两端的 `nuxt.config.ts` 曾经各 73 行、逐行 diff 只有 15 行不同 —— 也就是说约八成内容
 * 是逐字重复的，其中最长的一段（Tiptap / ProseMirror 单实例）连注释都一模一样。
 * 重复的代价不是行数，而是**改一处必然漏另一处**：那段配置讲的正是一个"漏了就炸"的坑。
 *
 * ## 它属于哪一层（`AGENTS.md` §4.6）
 *
 * 本包不碰 Vue / Nuxt UI 组件、不含业务语义，只负责产出一个配置对象 ——
 * 属「能脱离运行时」那一层。**因此它不引入 Nuxt layer 形态**：layer 会同时承担
 * "页面/组件/样式"与"构建基线"两种职责，正是三层判据要避免的混淆。
 *
 * 反过来说，**业务不进本包**：展示域 alias（`#rs/resume-content`）、业务模块、
 * 各端独有的运行时配置一律由调用方经 `overrides` 传入。
 */
export interface RsNuxtOptions {
  /** 应用名，仅用于可读性（错误信息 / 未来日志），不参与任何路径推导。 */
  readonly name: string
  /**
   * 调用方的 `import.meta.url`（即 `nuxt.config.ts` 自身的文件 URL）。
   *
   * 本包用它定位**应用根目录**，从而读该应用自己的 `package.json` 版本号、
   * 以及在该目录下执行 `git rev-parse`。这样调用方不必再手写 `fileURLToPath`。
   */
  readonly from: string
  /** 应用的源码目录，默认 `'app'`（Nuxt 4 约定）。 */
  readonly srcDir?: string
}

/**
 * `NuxtConfig`，再加上 **c12 的环境分段键**。
 *
 * 为什么需要这个类型：`$production` / `$development` **不属于 `@nuxt/schema` 的 `NuxtConfig`** ——
 * 它们是 c12（Nuxt 的配置加载器）的 `C12InputConfig` 提供的环境分段语法，由 c12 在加载时按
 * `NODE_ENV` 挑一层合并。所以只在 `NuxtConfig` 上写 `$production` 会报 `TS2353`。
 *
 * 之所以仍要在基线里用它：**生产不该产出 sourcemap**（避免把源码随产物发出去），
 * 而这件事用 Nuxt 自己的分层语法表达最直接，不必在构建脚本里另做手脚。
 *
 * 这是**类型**边界，不是运行时 hack —— 运行时 Nuxt/c12 本来就支持这些键。
 */
export type RsNuxtConfigInput = NuxtConfig & {
  $test?: NuxtConfig
  $development?: NuxtConfig
  $production?: NuxtConfig
  $env?: Record<string, NuxtConfig>
}

/**
 * 演示 / 示例页面的目录约定 —— **生产构建不进路由**。
 *
 * 约定（参考 `早期项目` 的做法）：演示页只能放在 `app/pages/_demo` 或
 * `app/pages/_examples` 下。
 *
 * ## 为什么 `_` 前缀挡不住
 *
 * `_` 前缀确实不会被当成正常路由段，但 `pages.pattern` 扫的是所有 .vue 文件 ——
 * 光有前缀挡不住它，必须显式排除（排除项形如：取反 + 双星号 + 目录名）。
 *
 * ## 为什么默认什么都不排除
 *
 * 本项目当前**没有**这两个目录，所以下面的排除项默认不产生任何条目，
 * 路由表与加这段之前**逐字一致**。等真的建了演示页就自动生效，不必再改这份配置。
 *
 * ## 为什么不只在生产排除
 *
 * 沿用参考项目的策略：**生产排除，本地/staging 仍可访问** —— 开发时要能点开看，
 * 上线时不该把 demo 页发给用户。
 *
 * ⚠️ 用 `pages.pattern` 而不是别的键：`pattern` 是本文件**已在用**的机制
 * （见下方私有组件的排除），行为确定；换一个未在此验证过的键等于给共享基线
 * 引入不确定性。
 */
const DEMO_PAGE_DIRS = ['_demo', '_examples'] as const

/**
 * 算出要排除的演示页通配符。
 *
 * ⚠️ 必须从**调用方传入 `appDir`**，不能用 `process.cwd()`：
 * 从仓库根执行（如 `pnpm -w ...`）时 cwd 不是应用目录，那会**静默地什么都不排除** ——
 * 配错了却看不出来。用 `options.from` 推导出的绝对路径才和调用方的意图一致。
 *
 * @param appDir 应用根目录（由 `options.from` 推导）
 * @returns 生产构建时排除演示页的通配符；开发 / staging 或目录不存在时为空数组
 */
function resolveDemoPageExcludes(appDir: string): string[] {
  if (process.env.NODE_ENV !== 'production') return []
  return DEMO_PAGE_DIRS.filter(name => existsSync(join(appDir, 'app/pages', name))).map(name => `!**/${name}/**`)
}

/**
 * Tiptap / ProseMirror 必须**单实例**，故显式列入 `optimizeDeps.include`。
 *
 * 现象（2026-10-15 真实复现）：`packages/ui` 的 `CustomSectionEditor` 挂载 `@nuxt/ui` 的
 * `UEditor` 时抛 `RangeError: Adding different instances of a keyed plugin (plugin$)`，
 * 堆栈落在 `prosemirror-state → EditorState.reconfigure`，结果是富文本区一片空白、点不动。
 *
 * 病因**不在安装**：磁盘上 `@tiptap/pm` 与所有 `prosemirror-*` 各只有一份。
 * 真正的分裂来自 **Vite dev 的按需预打包** —— `@tiptap/core` 的那份 `prosemirror-state`
 * 与运行时另加载的一份不是同一个模块实例。
 *
 * 两个必须遵守的细节（都是实测踩出来的，改这段前先读）：
 *
 * 1. `prosemirror-*` 是 `@nuxt/ui` 的**传递依赖**，`apps/*` 自己解析不到它，
 *    必须写成 `@nuxt/ui > prosemirror-*` 才能从那个依赖上下文里解析。
 * 2. **不要**把 `@tiptap/pm` 写进来：它没有根导出（只有 `@tiptap/pm/state` 这类子路径），
 *    写进去会让 Vite 启动直接失败 —— `"." is not exported from package .../@tiptap/pm`。
 *
 * 这段配置在 #37 移除自研编辑器时曾被删除；2026-10-15 富文本编辑器以
 * 「`packages/ui` 的 `CustomSectionEditor` + Nuxt UI `UEditor`」的形式重新引入，
 * 于是按当时留下的恢复提示加回来。编辑器两端共用，所以这段**只该存在一份** —— 即这里。
 */
const TIPTAP_OPTIMIZE_DEPS: readonly string[] = [
  '@nuxt/ui > prosemirror-gapcursor',
  '@nuxt/ui > prosemirror-model',
  '@nuxt/ui > prosemirror-state',
  '@nuxt/ui > prosemirror-tables',
  '@nuxt/ui > prosemirror-transform',
  '@nuxt/ui > prosemirror-view',
  '@tiptap/core',
  '@tiptap/starter-kit',
  '@tiptap/vue-3',
]

/**
 * **通过类型增强提供、因而不在 `@nuxt/schema` 核心里的配置键。**
 *
 * 这是本包唯一无法静态校验的部分，理由值得记住（否则以后会反复踩同一个坑）：
 * `NuxtConfig` **没有索引签名**，而其中相当一部分键并不是 schema 自己声明的，
 * 而是由内部包或模块 `declare module` 增强进来：
 *
 * | 键           | 由谁提供                                       | 为什么本包看不到                                                                     |
 * | ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
 * | `icon`       | `@nuxt/icon`（`@nuxt/ui` 的传递依赖）          | 它只增强 `NuxtHooks`；配置键由 Nuxt 在 `nuxt prepare` 时按应用实际模块集生成          |
 * | `routeRules` | `@nuxt/nitro-server` 的 `dist/augments.d.mts`  | 内部包，且不在 `@nuxt/schema` 的导出面上                                              |
 *
 * 这些键的类型**不是任何可 import 的单一入口**，而是"每个应用各自解析出来的结果" ——
 * 所以一个与模块无关的共享配置包，天然无法证明它们存在。
 *
 * 处理方式：**只在这一小块**放弃静态校验；其余键（`modules` / `css` / `srcDir` / `vite` /
 * `runtimeConfig` / `typescript` / `devtools` / `compatibilityDate` …）仍完整受类型检查 ——
 * 对象展开合并不会触发"多余属性"检查，所以这一块能安全并入。
 *
 * ⚠️ **往这里加键之前要格外小心**：加错了不会有编译错误，只会在运行时报错。
 */
const AUGMENTED_OPTIONS = {
  // 图标：默认会自动发现本地安装的 `@iconify-json/*` 集（lucide、ri …），
  // 再加上这里的**本地 svg 目录** —— 三者共用同一套类名约定：
  //   i-lucide-*      Lucide（Nuxt UI 默认集）
  //   i-ri-*          Remix Icon（@iconify-json/ri，已安装）
  //   其他 iconify 集  装一个 @iconify-json/<集名> 就能用 i-<集名>-*
  //   i-local:*       app/assets/icons/*.svg 里的本地图标（文件名即图标名）
  icon: {
    customCollections: [{ prefix: 'local', dir: './app/assets/icons' }],
  },

  // 安全基线：不允许被其它源用 iframe 嵌套。
  // ⚠️ 这同时**关掉了**"把公开简历页嵌到别处"的能力。若将来需要对外提供嵌入，
  //    要在这里按路径放开（`frame-ancestors` 白名单），而不是整体删掉。
  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    },
  },
}

/**
 * 组装共享基线，并与调用方的 `overrides` 合并，返回可直接 `export default` 的 Nuxt 配置。
 *
 * ## 合并语义（重要）
 *
 * 用 `defu` 做深合并，**`overrides` 优先**。注意 defu 对**数组是拼接而非覆盖**：
 * 因此调用方**不要重复声明基线里已有的条目**（`modules` / `css` / `optimizeDeps.include`），
 * 只追加自己独有的即可。
 *
 * `runtimeConfig.public` 是深合并的，所以各端既能继承基线的 `apiBase`，
 * 又能只补自己的字段（例如 admin 的 `loginPath`）。
 *
 * @param options 应用身份与目录信息，见 {@link RsNuxtOptions}。
 * @param overrides 该应用独有的配置；与本基线冲突时以它为准。
 * @returns 已与基线合并、并经 `defineNuxtConfig` 包装的配置对象。
 */
export function defineRsNuxtConfig(options: RsNuxtOptions, overrides: RsNuxtConfigInput = {}): NuxtConfig {
  const appDir = fileURLToPath(new URL('.', options.from))

  const base: RsNuxtConfigInput = {
    ...AUGMENTED_OPTIONS,

    // Nuxt 4 的源码目录约定：应用代码在 app/ 下
    srcDir: options.srcDir ?? 'app',

    // 两端一致的模块与样式入口。追加模块请写在 overrides 里（defu 会拼接数组）。
    modules: ['@nuxt/ui', '@pinia/nuxt', '@pinia/colada-nuxt'],
    css: ['~/assets/css/main.css'],

    devtools: { enabled: true },

    // ── 页面私有组件（B1）─────────────────────────────────────────────────────
    // 这两项是**一对**，缺一不可，理由见 rsPagePrivateComponents 的文档注释：
    //   hooks  —— 把页面目录下的 components 子目录注册为自动导入组件（便利）
    //   pages  —— 把它排除出路由扫描（安全网；只做便利会让私有组件变成可访问页面）
    hooks: {
      ...rsPagePrivateComponents(),
    },
    pages: {
      // 私有组件排除（上一行的 hooks 负责注册它们）+ 生产构建时排除演示页
      pattern: ['**/*.vue', '!**/components/**', ...resolveDemoPageExcludes(appDir)],
    },

    typescript: { strict: true, typeCheck: true },

    // 两端原本都是这个值；统一在基线里，未来升级时只有一处要改。
    compatibilityDate: '2025-01-01',

    runtimeConfig: {
      public: {
        // ⚠️ 保留原有的 `process.env` 读取方式，本卡只做"搬家"、不改语义。
        //    （Nuxt 自身的 `NUXT_PUBLIC_*` 覆盖机制与这里是重复的，属独立发现，另轮处理。）
        apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4049/api',
        /** 应用版本，取自该应用自己的 package.json */
        version: readPackageVersion(appDir),
        /** 构建时的短提交号；不可得时为 'unknown'（见 readGitCommit） */
        commit: readGitCommit(appDir),
      },
    },

    // 生产不产出 sourcemap：避免把源码随产物一起发出去，也省掉无用的 .map 体积。
    $production: {
      sourcemap: { client: false, server: false },
    },

    // ── 环境分段与构建细节：**模板**，需要时取消注释 ────────────────────────────
    //
    // 参考 早期项目/nuxt.config.ts 的做法整理。那一份用的是 UnoCSS + PrimeVue +
    // Vite 8（Rolldown），本项目是 Tailwind v4 + Nuxt 4 内置 Vite —— **能搬的是思路，不是原文**。
    // 下面每一条都注明了"什么情况下才需要开"。
    //
    // ⚠️ 别整块打开：这些键大多只在特定阶段有意义，全开会给两端都加上无谓的构建成本。
    /*
    $development: {
      // 开发时保留 sourcemap，方便断点进源码
      sourcemap: { client: true, server: true },
    },
    */

    /*
    vite: {
      build: {
        // 单个 chunk 超过 1024 KB 才告警（默认 500 KB）。本项目页面少、依赖偏重，
        // 默认阈值会一直刷警告，反而让人忽略真正的体积问题
        chunkSizeWarningLimit: 1024,
        // 按入口拆分 CSS（默认已按 chunk 拆，这里显式写出来是为了"意图可见"）
        cssCodeSplit: true,
      },
      $client: {
        build: {
          // 客户端产物去掉 console / debugger。⚠️ 只在构建期生效，
          // dev 仍保留 —— 否则本地调试时 console 全哑
          // （Nuxt 4 内置 Vite 的写法；Vite 8/Rolldown 要改用 rolldownOptions.output.minify）
          terserOptions: { compress: { drop_console: true, drop_debugger: true } },
        },
      },
    },
    */

    /*
    // Nuxt UI 的主题前缀 —— **只在 Tailwind 与 UnoCSS/PrimeVue 共存时才需要**。
    // 本项目不装 UnoCSS，所以不加：加了会把所有 Nuxt UI 的类名变成 tw: 前缀，
    // 现有样式全部失效。
    ui: {
      theme: { prefix: 'tw' },
    },
    */

    /*
    // 关掉 Nuxt UI 自带的字体与暗色模式 —— 只有在"已经有自己的字体方案 / 明确不做暗色"时开。
    // 本项目暂时保持 Nuxt UI 默认，两边都还没定。
    ui: {
      fonts: false,
      colorMode: false,
    },
    */

    /*
    // 自动导入额外的目录与第三方工具函数（参考项目用了 radashi）。
    // 本项目目前没有 stores 目录，也没有引这类工具库 —— 需要时再开。
    imports: {
      dirs: ['stores'],
      presets: [
        // { from: 'radashi', imports: ['isArray', 'isEqual', 'tryit'] },
      ],
    },
    */

    vite: {
      optimizeDeps: {
        include: [...TIPTAP_OPTIMIZE_DEPS],
      },
    },
  }

  return defineNuxtConfig(defu(overrides, base) as NuxtConfig)
}
