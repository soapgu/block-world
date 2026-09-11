import type { GameEvent } from '../game/engine'
import { getAudioContext, getMasterGain, isMuted, setMuted } from './context'

/**
 * 复古蜂鸣器风格音效：Web Audio 现场合成，不引入任何音频文件。
 * AudioContext 由 ./context 懒初始化并全局共享。
 */
class Sfx {
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
    }
  }

  play(event: GameEvent): void {
    if (isMuted()) return
    const ctx = getAudioContext()
    const master = getMasterGain()
    if (!ctx || !master) return
    const t = ctx.currentTime
    switch (event.type) {
      case 'eat':
        this.beep(ctx, master, t, 440, 0.04, 'square', 0.55)
        break
      case 'eatBonus':
        // 上行双哔：奖励比普通食物更"亮"
        this.beep(ctx, master, t, 660, 0.05, 'square', 0.55)
        this.beep(ctx, master, t + 0.06, 880, 0.05, 'square', 0.55)
        break
      case 'bonusExpire':
        // 低音轻叹：错失奖励，音量刻意压低
        this.beep(ctx, master, t, 220, 0.08, 'triangle', 0.3)
        break
      case 'gameOver':
        // 下行三音：与 tetris 死亡音一致的告别感
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

  private track(source: AudioScheduledSourceNode): void {
    this.activeSources.add(source)
    source.addEventListener('ended', () => this.activeSources.delete(source), {
      once: true,
    })
  }
}

export const sfx = new Sfx()
