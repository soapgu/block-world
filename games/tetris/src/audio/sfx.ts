import type { GameEvent } from '../game/engine'

/** 主音量（0~1），全部音效统一走这里，静音开关直接控制它 */
const MASTER_VOLUME = 0.15

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

/**
 * 复古蜂鸣器风格音效：Web Audio 现场合成，不引入任何音频文件。
 * AudioContext 懒初始化——首次发声必然发生在回车开局（用户手势）之后，
 * 满足浏览器自动播放策略。
 */
class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : MASTER_VOLUME,
        this.ctx.currentTime,
        0.01,
      )
    }
  }

  play(event: GameEvent): void {
    const ctx = this.ensureContext()
    if (!ctx) return
    const t = ctx.currentTime
    switch (event.type) {
      case 'move':
        this.beep(t, 200, 0.03, 'square', 0.6)
        break
      case 'rotate':
        this.beep(t, 350, 0.04, 'square', 0.6)
        break
      case 'hold':
        this.beep(t, 300, 0.03, 'square', 0.5)
        this.beep(t + 0.05, 420, 0.03, 'square', 0.5)
        break
      case 'hardDrop':
        this.sweep(t, 300, 100, 0.08, 0.7)
        break
      case 'lock':
        this.beep(t, 120, 0.08, 'triangle', 0.8)
        break
      case 'clear': {
        this.noise(t, 0.12, 0.5)
        // 按行数升调的短琶音，行数越多越亮
        const base = 330 + event.lines * 60
        for (let i = 0; i <= event.lines; i++) {
          this.beep(t + i * 0.06, base + i * 80, 0.05, 'square', 0.5)
        }
        break
      }
      case 'tetris': {
        this.noise(t, 0.25, 0.6)
        // C-E-G-C 上行胜利琶音
        for (const [i, freq] of [523, 659, 784, 1047].entries()) {
          this.beep(t + i * 0.08, freq, 0.09, 'square', 0.6)
        }
        break
      }
      case 'levelUp':
        this.sweep(t, 300, 900, 0.25, 0.5)
        break
      case 'gameOver':
        for (const [i, freq] of [392, 311, 262].entries()) {
          this.beep(t + i * 0.18, freq, 0.16, 'triangle', 0.6)
        }
        break
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx === null) {
      const AC =
        window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** 单音：指定波形 + 指数衰减包络 */
  private beep(
    at: number,
    freq: number,
    seconds: number,
    type: OscillatorType,
    velocity: number,
  ): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(velocity, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds)
    osc.connect(gain).connect(this.master!)
    osc.start(at)
    osc.stop(at + seconds)
  }

  /** 频率滑音（下坠/升级） */
  private sweep(
    at: number,
    from: number,
    to: number,
    seconds: number,
    velocity: number,
  ): void {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(from, at)
    osc.frequency.exponentialRampToValueAtTime(to, at + seconds)
    gain.gain.setValueAtTime(velocity, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds)
    osc.connect(gain).connect(this.master!)
    osc.start(at)
    osc.stop(at + seconds)
  }

  /** 白噪声（消行的"哗"） */
  private noise(at: number, seconds: number, velocity: number): void {
    const ctx = this.ctx!
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(velocity, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds)
    src.connect(gain).connect(this.master!)
    src.start(at)
  }
}

export const sfx = new Sfx()
