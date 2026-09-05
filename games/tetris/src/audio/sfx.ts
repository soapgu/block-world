import type { GameEvent } from '../game/engine'
import { getAudioContext, getMasterGain, setMuted } from './context'

/**
 * 复古蜂鸣器风格音效：Web Audio 现场合成，不引入任何音频文件。
 * AudioContext 由 ./context 懒初始化并全局共享（BGM 复用）。
 */
class Sfx {
  setMuted(muted: boolean): void {
    setMuted(muted)
  }

  play(event: GameEvent): void {
    const ctx = getAudioContext()
    const master = getMasterGain()
    if (!ctx || !master) return
    const t = ctx.currentTime
    switch (event.type) {
      case 'move':
        this.beep(ctx, master, t, 200, 0.03, 'square', 0.6)
        break
      case 'rotate':
        this.beep(ctx, master, t, 350, 0.04, 'square', 0.6)
        break
      case 'hold':
        this.beep(ctx, master, t, 300, 0.03, 'square', 0.5)
        this.beep(ctx, master, t + 0.05, 420, 0.03, 'square', 0.5)
        break
      case 'hardDrop':
        this.sweep(ctx, master, t, 300, 100, 0.08, 0.7)
        break
      case 'lock':
        this.beep(ctx, master, t, 120, 0.08, 'triangle', 0.8)
        break
      case 'clear': {
        this.noise(ctx, master, t, 0.12, 0.5)
        // 按行数升调的短琶音，行数越多越亮
        const base = 330 + event.lines * 60
        for (let i = 0; i <= event.lines; i++) {
          this.beep(ctx, master, t + i * 0.06, base + i * 80, 0.05, 'square', 0.5)
        }
        break
      }
      case 'tetris': {
        this.noise(ctx, master, t, 0.25, 0.6)
        // C-E-G-C 上行胜利琶音
        for (const [i, freq] of [523, 659, 784, 1047].entries()) {
          this.beep(ctx, master, t + i * 0.08, freq, 0.09, 'square', 0.6)
        }
        break
      }
      case 'levelUp':
        this.sweep(ctx, master, t, 300, 900, 0.25, 0.5)
        break
      case 'gameOver':
        for (const [i, freq] of [392, 311, 262].entries()) {
          this.beep(ctx, master, t + i * 0.18, freq, 0.16, 'triangle', 0.6)
        }
        break
    }
  }

  /** 单音：指定波形 + 指数衰减包络 */
  private beep(
    ctx: AudioContext,
    master: GainNode,
    at: number,
    freq: number,
    seconds: number,
    type: OscillatorType,
    velocity: number,
  ): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(velocity, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds)
    osc.connect(gain).connect(master)
    osc.start(at)
    osc.stop(at + seconds)
  }

  /** 频率滑音（下坠/升级） */
  private sweep(
    ctx: AudioContext,
    master: GainNode,
    at: number,
    from: number,
    to: number,
    seconds: number,
    velocity: number,
  ): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(from, at)
    osc.frequency.exponentialRampToValueAtTime(to, at + seconds)
    gain.gain.setValueAtTime(velocity, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds)
    osc.connect(gain).connect(master)
    osc.start(at)
    osc.stop(at + seconds)
  }

  /** 白噪声（消行的"哗"） */
  private noise(
    ctx: AudioContext,
    master: GainNode,
    at: number,
    seconds: number,
    velocity: number,
  ): void {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(velocity, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds)
    src.connect(gain).connect(master)
    src.start(at)
  }
}

export const sfx = new Sfx()
