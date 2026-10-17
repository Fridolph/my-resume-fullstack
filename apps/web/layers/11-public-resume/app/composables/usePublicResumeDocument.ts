import type { InjectionKey, Ref } from 'vue'
import type { ResumeDocument } from '@rs/common'

/**
 * 「当前正在展示的文档」在公开页内的传递通道（`provide` / `inject`）。
 *
 * ## 为什么需要它
 *
 * 展示设置的「区块显隐」tab 要列**真实文档里的模块**，但它挂在抽屉里、
 * 离 `ResumePublicShell` 隔了好几层。用 props 一层层传会把中间组件全变成"透传管道"。
 *
 * ## 为什么之前是错的
 *
 * 那个 tab 原来读 `useResumeContent()` —— 一个 legacy 本地 mock，`sections` 是空数组，
 * 于是**永远列不出任何模块**。而文档里的 section id 是 UUID，与 mock 的 key 也对不上。
 * 症状是"tab 打开是空的"，没有任何报错。
 */
export const PUBLIC_RESUME_DOCUMENT_KEY: InjectionKey<Ref<ResumeDocument | null>> = Symbol('publicResumeDocument')
