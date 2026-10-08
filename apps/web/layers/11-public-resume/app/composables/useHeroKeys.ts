/**
 * Info 的「琴键」音效：从第一个键起，按 C 大调音阶依次发声。
 *
 * 两个决定：
 * 1. **自己合成，不放音频文件**：项目约定不引第三方资源；一个振荡器 + 短包络就足以表达
 *    「琴键」而不是蜂鸣，体积为零，也没有素材来源问题。
 * 2. **首次点击才创建 `AudioContext`**：浏览器的自动播放策略要求音频由用户手势解锁。
 *    在 SSR、不支持 Web Audio、或用户从未点击的环境里，这里静默跳过 ——
 *    音效是附加值，不能影响「点击复制」这个主功能。
 */
const SCALE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

/** 音名 → 相对主音的半音数（C 大调没有升降号） */
const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** C4 = 261.63Hz */
const BASE_FREQUENCY = 261.63

export function useHeroKeys() {
  const unlocked = ref(false)
  let context: AudioContext | null = null

  function ensureContext(): AudioContext | null {
    if (!import.meta.client) {
      return null
    }

    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) {
      return null
    }

    context ??= new Ctor()
    if (context.state === 'suspended') {
      void context.resume()
    }
    unlocked.value = true

    return context
  }

  /** 按第 `index` 个键发声（index 从 0 起；超出音阶自动升八度） */
  function playKey(index: number) {
    const ctx = ensureContext()
    if (!ctx) {
      return
    }

    const name = SCALE[index % SCALE.length]!
    const octave = Math.floor(index / SCALE.length)
    const frequency = BASE_FREQUENCY * 2 ** ((SEMITONE[name]! + octave * 12) / 12)

    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, now)

    // 极短 attack + 指数衰减：听感是「一个键被按一下」，而不是持续音
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.16, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.9)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.95)
  }

  onBeforeUnmount(() => {
    void context?.close()
    context = null
  })

  return { playKey, unlocked }
}
