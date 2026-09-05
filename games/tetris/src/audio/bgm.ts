import { getAudioContext, getMasterGain } from './context'

/** 一拍时长（秒），~150 BPM */
const BEAT = 60 / 150
/** 调度提前量：每 50ms 醒来，把未来 120ms 内的音符排上时间轴 */
const SCHEDULE_AHEAD = 0.12
const TIMER_MS = 50
/** BGM 自身音量（接在主音量之下，比音效更轻） */
const BGM_VOLUME = 0.55

/** 休止符 */
const REST = 0
/** midi 音高 → 频率 */
function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/**
 * Korobeiniki（俄罗斯方块主题曲）A 段旋律，[midi, 拍数]。
 * 常用 E 小调记谱，此处用 midi：E5=76, B4=71, C5=72, D5=74, ...
 */
const MELODY: Array<readonly [number, number]> = [
  // 第 1 小节
  [76, 1], [76, 1], [REST, 1], [76, 1],
  [REST, 1], [72, 1], [76, 1], [REST, 1],
  // 第 2 小节
  [74, 1], [REST, 2], [67, 1], [REST, 2],
  // 第 3 小节（重复句）
  [70, 1], [REST, 2], [67, 1], [REST, 1],
  [64, 1], [REST, 2],
  // 第 4 小节
  [72, 1], [REST, 1], [64, 1], [REST, 1],
  [67, 1], [REST, 1], [71, 1], [REST, 1],
  // 第 5 小节
  [71, 1], [REST, 1], [70, 1], [REST, 1],
  [67, 1], [REST, 1], [76, 1], [REST, 1],
  // 第 6 小节
  [72, 1], [REST, 1], [74, 1], [REST, 1],
  [79, 1], [REST, 3],
  // 第 7 小节
  [77, 1], [REST, 1], [79, 1], [REST, 1],
  [REST, 1], [76, 1], [REST, 1], [72, 1],
  // 第 8 小节
  [74, 1], [71, 1], [REST, 1], [67, 1],
  [REST, 1], [64, 1], [REST, 2],
]

/** 低音声部：每拍根音，与旋律按小节对齐（E 小调进行 E-B-G-A 的简化） */
const BASS: Array<readonly [number, number]> = [
  [40, 4], [40, 4],
  [43, 4], [43, 4],
  [40, 4], [35, 4],
  [40, 4], [40, 4],
  [45, 4], [40, 4],
  [43, 4], [40, 4],
]

/**
 * 8-bit 风 BGM：音符表 + lookahead 定时调度（Web Audio 经典节拍器模式）。
 * 单例；start/stop 幂等；静音走 context 的主音量总开关。
 */
class Bgm {
  private timer: ReturnType<typeof setInterval> | null = null
  private nextNoteTime = 0
  private melodyIndex = 0
  private melodyBeat = 0
  private bassIndex = 0
  private bassBeat = 0

  get playing(): boolean {
    return this.timer !== null
  }

  start(): void {
    if (this.timer !== null) return
    const ctx = getAudioContext()
    if (!ctx) return
    this.nextNoteTime = ctx.currentTime + 0.1
    this.timer = setInterval(() => this.schedule(), TIMER_MS)
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** 把窗口期内到点的旋律/低音音符排上时间轴 */
  private schedule(): void {
    const ctx = getAudioContext()
    const master = getMasterGain()
    if (!ctx || !master) return

    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const [note, beats] = MELODY[this.melodyIndex]
      const noteStart = this.nextNoteTime + this.melodyBeat * BEAT
      if (note !== REST) {
        this.noteOn(
          ctx, master,
          noteStart, beats * BEAT, hz(note), 'square', 0.5,
        )
      }
      // 同窗口内到点的低音
      this.scheduleBassAt(ctx, master, noteStart, beats)
      this.melodyIndex = (this.melodyIndex + 1) % MELODY.length
      this.melodyBeat = 0
      this.nextNoteTime = noteStart + beats * BEAT
    }
  }

  /** 排进一个旋律音符窗口内的低音（可能 0~多个） */
  private scheduleBassAt(
    ctx: AudioContext,
    master: GainNode,
    from: number,
    windowBeats: number,
  ): void {
    let beat = this.bassBeat
    while (beat < windowBeats) {
      const [note, beats] = BASS[this.bassIndex]
      const start = from + (beat - this.bassBeat) * BEAT
      this.noteOn(
        ctx, master,
        start, beats * BEAT * 0.9, hz(note), 'triangle', 0.7,
      )
      beat += beats
      this.bassIndex = (this.bassIndex + 1) % BASS.length
      this.bassBeat = beat
    }
    // 窗口结束后残余拍数留给下一次
    this.bassBeat = beat - windowBeats
    if (this.bassBeat < 0) this.bassBeat = 0
  }

  /** 一个音符：起音-持续-释放（8-bit 直挺包络） */
  private noteOn(
    ctx: AudioContext,
    master: GainNode,
    at: number,
    seconds: number,
    freq: number,
    type: OscillatorType,
    velocity: number,
  ): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    const release = Math.min(0.05, seconds * 0.3)
    gain.gain.setValueAtTime(velocity * BGM_VOLUME, at)
    gain.gain.setValueAtTime(velocity * BGM_VOLUME, at + seconds - release)
    gain.gain.linearRampToValueAtTime(0.0001, at + seconds)
    osc.connect(gain).connect(master)
    osc.start(at)
    osc.stop(at + seconds)
  }
}

export const bgm = new Bgm()
