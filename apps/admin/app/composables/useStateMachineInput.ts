import type { Rive, StateMachineInput } from '@rive-app/webgl2'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'

export type { StateMachineInput }

/**
 * 从 Rive 实例上取一个**状态机输入**（`boolean` / `number` / `trigger`）。
 *
 * ## 为什么需要它
 *
 * `.riv` 文件里的交互不是"播放某个动画"，而是"状态机 + 输入"模型：
 * 你改输入的**值**，状态机自己决定跳转到哪个状态与过渡。Rive 的原始 API 是两段式 ——
 * 先 `stateMachineInputs(name)` 拿到**数组**，再自己 `find` 出名字匹配的那个。
 * 每次操作都写这两步太啰嗦，而且容易忘记判空（实例刚加载完时可能还没有输入），
 * 所以收成一个函数。它**只有 10 行、但被每个用到 Rive 的组件调用** —— 属于"有真实复用"。
 *
 * ## 为什么返回值可能是 `null`
 *
 * 输入名写错、或 Rive 还没加载完，都会拿不到。返回 `null` 而不是抛错，
 * 是为了让调用方可以"能拿到就接、拿不到就跳过"，而不是整块交互崩掉。
 *
 * @param rive Rive 实例（也接受 ref，内部会 `unref`）
 * @param stateMachineName 状态机名（`.riv` 里定义的）
 * @param inputName 输入名
 */
export function useStateMachineInput(
  rive: MaybeRef<Rive | null>,
  stateMachineName?: string,
  inputName?: string,
): StateMachineInput | null {
  const riveInstance = unref(rive)

  if (!riveInstance || !stateMachineName || !inputName) {
    return null
  }

  const inputs = riveInstance.stateMachineInputs(stateMachineName)
  return inputs?.find(input => input.name === inputName) ?? null
}
