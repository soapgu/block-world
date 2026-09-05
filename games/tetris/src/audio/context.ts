/** 音效与 BGM 共用的 AudioContext 管理：懒创建 + 静音总开关 */

/** 总音量（0~1），静音开关直接控制它 */
const MASTER_VOLUME = 0.15

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

/**
 * 取共享 AudioContext（不存在则创建），suspended 时尝试恢复。
 * 首次调用必然发生在回车开局（用户手势）之后，满足自动播放策略。
 */
export function getAudioContext(): AudioContext | null {
  if (ctx === null) {
    const AC =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : MASTER_VOLUME
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 主 GainNode：所有发声源都应接到这里。 */
export function getMasterGain(): GainNode | null {
  getAudioContext()
  return master
}

/** 静音总开关（音效与 BGM 一起静） */
export function setMuted(next: boolean): void {
  muted = next
  if (ctx && master) {
    master.gain.setTargetAtTime(
      muted ? 0 : MASTER_VOLUME,
      ctx.currentTime,
      0.01,
    )
  }
}

export function isMuted(): boolean {
  return muted
}
