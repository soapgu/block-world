import type { GameEvent } from '../game/engine'
import { getAudioContext, getMasterGain, isMuted, setMuted } from './context'

const SOFT_DROP_INTERVAL = 0.012
const HARD_DROP_SECONDS = 0.105

/**
 * 复古蜂鸣器风格音效：Web Audio 现场合成，不引入任何音频文件。
 * AudioContext 由 ./context 懒初始化并全局共享（BGM 复用）。
 */
class Sfx {
  /** 单帧补算多格软降时错开发声，避免多个振荡器完全叠加 */
  private nextSoftDropAt = 0
  /** 硬降后紧随的锁定声排在滑音末尾，避免两个音效糊在一起 */
  private hardDropEndsAt = 0
  /** 静音时停止尚未播放完的调度音源，避免恢复声音后出现残响 */
  private activeSources = new Set<AudioScheduledSourceNode>()

  setMuted(muted: boolean): void {
    setMuted(muted)
    if (muted) {
      for (const source of this.activeSources) {
        try {
          source.stop()
        } catch {
          // 已停止的 Web Audio 节点再次 stop 会抛错，忽略即可。
        }
      }
      this.activeSources.clear()
      this.nextSoftDropAt = 0
      this.hardDropEndsAt = 0
    }
  }

  play(event: GameEvent): void {
    if (isMuted()) return
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
      case 'softDrop': {
        const at = Math.max(t, this.nextSoftDropAt)
        this.nextSoftDropAt = at + SOFT_DROP_INTERVAL
        this.beep(ctx, master, at, 340, 0.014, 'square', 0.2)
        break
      }
      case 'hardDrop':
        this.hardDropEndsAt = t + HARD_DROP_SECONDS
        this.sweep(ctx, master, t, 900, 160, HARD_DROP_SECONDS, 0.58)
        break
      case 'lock': {
        const at = this.hardDropEndsAt > t ? this.hardDropEndsAt : t
        this.hardDropEndsAt = 0
        this.playLanding(ctx, master, at)
        break
      }
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
    this.track(osc)
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
    this.track(osc)
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
    this.track(src)
    src.start(at)
  }

  /** 清脆碰撞音叠加轻量低频，既能听清触地又不会变成闷响。 */
  private playLanding(ctx: AudioContext, master: GainNode, at: number): void {
    this.beep(ctx, master, at, 260, 0.024, 'square', 0.52)
    this.beep(ctx, master, at, 105, 0.055, 'triangle', 0.48)
  }

  private track(source: AudioScheduledSourceNode): void {
    this.activeSources.add(source)
    source.addEventListener('ended', () => this.activeSources.delete(source), {
      once: true,
    })
  }
}

export const sfx = new Sfx()
