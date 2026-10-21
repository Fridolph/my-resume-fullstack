import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { useNuxt } from '@nuxt/kit'
import type { NuxtConfig } from 'nuxt/schema'

/**
 * `pathPrefix: true` 会把路径段一并拼进组件名，于是
 * `pages/capabilities/components/Card.vue` 得到的是 `CapabilitiesComponentsCard` ——
 * 中间的 `Components` 纯粹是**目录名噪音**，它不携带任何语义。
 *
 * 去掉它之后是 `CapabilitiesCard`：既保留了"哪个页面"的作用域（避免不同页面的同名组件
 * 静默冲突），又不把一个实现细节（组件放在哪个目录）写进模板标签名。
 *
 * 这两个正则就是 早期项目 里那段 `RE_COMPONENTS` / `RE_COMPONENTS_KEBAB` 归一。
 * 起初判断"那是那个仓自己的命名约定、不必移植"——**实测后修正**：它是 `pathPrefix: true`
 * 的必要配套，不这么做得到的名字不可用（`<ProbeComponentsProbeCard />`）。
 */
const COMPONENTS_SEGMENT_PASCAL = /Components/g
const COMPONENTS_SEGMENT_KEBAB = /components-/g

/**
 * 把**页面目录下的 `components` 子目录**注册为「页面私有组件」。
 *
 * ## 它解决什么问题
 *
 * 一个页面复杂到一定程度，自然想把它自己的小组件放在旁边 —— 目录上最自然的落点就是
 * 页面所在目录下的 `components/`。但 Nuxt 默认会把 `pages/` 下的**每个 `.vue` 都当成路由**，
 * 于是"私有组件"会**变成一个可以被外部访问的页面**。这是真实存在的坑，而不是洁癖问题。
 *
 * 所以这件事必须**两件一起做**，缺一不可：
 *
 * 1. `pages.pattern` 排除 `components` 子目录（**安全网**：不让它成为路由）；
 * 2. 本 hook 把这些目录注册为自动导入组件（**便利**：页面里不用手写 import）。
 *
 * 只做 1 → 组件得手写 import；只做 2 → 组件同时成为可访问路由。
 *
 * ## 为什么要遍历 `nuxt.options._layers`
 *
 * 本仓是多 layer 结构：`apps/*` 自身、`packages/ui`、以及靠 Nuxt 4 的 `layers/` 约定
 * **自动发现**的业务 layer（如 `apps/web/layers/11-public-resume`，它不是显式 `extends` 进来的）。
 * 只扫应用自身会漏掉业务 layer 里的页面组件，所以按 layer 逐个处理。
 *
 * ## 名称策略：`pathPrefix` + 去掉 `Components` 段
 *
 * 不同页面可能各自有同名组件（都叫 `Card` 之类），所以需要**页面级作用域** → `pathPrefix: true`。
 * 但它会连"组件放在 `components` 目录"这件实现细节也拼进名字（`CapabilitiesComponentsCard`），
 * 所以再用 `extendComponent` 去掉那一段 → `CapabilitiesCard`。两者的理由见常量处的注释。
 */
export function rsPagePrivateComponents(): NuxtConfig['hooks'] {
  return {
    'components:dirs': dirs => {
      const nuxt = useNuxt()

      for (const layer of nuxt.options._layers) {
        // 两个候选覆盖本仓可能出现的形态：
        //   app/pages —— Nuxt 4 默认（srcDir: 'app'）
        //   pages     —— srcDir 就是层根目录
        //
        // ⚠️ 已知边界：若某个层显式把 srcDir 设成 `app` 之外的名字，它的页面目录不在候选里，
        //    该层的页面私有组件不会被注册。`NuxtConfigLayer` 的类型上没有可直接读的 `srcDir`
        //    （只有 `cwd` / `configFile`），所以这里不靠猜去拼路径。真出现这种层时再补。
        const candidates = [resolve(layer.cwd, 'app/pages'), resolve(layer.cwd, 'pages')]

        for (const pagesDir of candidates) {
          if (!existsSync(pagesDir)) continue
          dirs.push({
            path: pagesDir,
            // 只收 components 子目录里的组件；页面本身仍由 pages 扫描器处理
            pattern: '**/components/**/*.vue',
            pathPrefix: true,
            extendComponent(component) {
              component.pascalName = component.pascalName.replace(COMPONENTS_SEGMENT_PASCAL, '')
              component.kebabName = component.kebabName.replace(COMPONENTS_SEGMENT_KEBAB, '')
            },
          })
        }
      }
    },
  }
}
