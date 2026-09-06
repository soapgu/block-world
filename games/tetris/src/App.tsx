import { useCallback, useEffect, useRef, useState } from 'react'
import { BoardCanvas } from './components/BoardCanvas'
import { CompactBar } from './components/CompactBar'
import { Overlay } from './components/Overlay'
import { StatsPanel } from './components/StatsPanel'
import { TouchControls } from './components/TouchControls'
import { bgm } from './audio/bgm'
import { Engine } from './game/engine'
import type { UiSnapshot } from './game/engine'
import { useAutoPause } from './hooks/useAutoPause'
import { useBestScore } from './hooks/useBestScore'
import { useGameLoop } from './hooks/useGameLoop'
import { useKeyboard } from './hooks/useKeyboard'
import { useSound } from './hooks/useSound'
import { boardPixelHeight, boardPixelWidth, drawGame } from './render/canvas'

const MUTED_KEY = 'tetris:muted'
const BGM_KEY = 'tetris:bgm'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // 隐私模式等场景下写入失败可接受
  }
}

function sameUi(a: UiSnapshot, b: UiSnapshot): boolean {
  return (
    a.score === b.score &&
    a.lines === b.lines &&
    a.level === b.level &&
    a.state === b.state &&
    a.hold === b.hold &&
    a.next.join() === b.next.join()
  )
}

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  if (!engineRef.current) engineRef.current = new Engine()
  const engine = engineRef.current

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ui, setUi] = useState<UiSnapshot>(() => engine.getUiSnapshot())
  const [muted, setMuted] = useState(() => readFlag(MUTED_KEY))
  const [bgmOn, setBgmOn] = useState(() => readFlag(BGM_KEY))
  const [best, isNewBest] = useBestScore(engine)
  // 触屏设备才渲染虚拟按键与精简信息条（CSS 断点控制具体布局）
  const [isTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  const toggleMute = useCallback(() => setMuted((m) => !m), [])
  const toggleBgm = useCallback(() => setBgmOn((b) => !b), [])

  useEffect(() => writeFlag(MUTED_KEY, muted), [muted])
  useEffect(() => writeFlag(BGM_KEY, bgmOn), [bgmOn])

  // BGM：仅在游戏中循环，暂停/结束停止；M 静音由主音量统一控制
  useEffect(() => {
    if (bgmOn && ui.state === 'playing') bgm.start()
    else bgm.stop()
  }, [bgmOn, ui.state])

  // 按设备像素比设置画布物理尺寸，保证高清屏下清晰
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = boardPixelWidth() * dpr
    canvas.height = boardPixelHeight() * dpr
  }, [])

  useKeyboard(engine, toggleMute, toggleBgm)
  useSound(engine, muted)
  useAutoPause(engine)

  useGameLoop((dt) => {
    engine.update(dt)

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawGame(ctx, engine)
    }

    // 引擎数据在 ref 里，这里只在变化时同步进 React（避免每帧重渲染外壳）
    const snapshot = engine.getUiSnapshot()
    setUi((prev) => (sameUi(prev, snapshot) ? prev : snapshot))
  })

  return (
    <div className={isTouch ? 'page touch' : 'page'}>
      <div className="toolbar">
        <button
          className="tool-btn"
          onClick={toggleBgm}
          aria-pressed={bgmOn}
          title={bgmOn ? '关闭 BGM（B）' : '开启 BGM（B）'}
        >
          {bgmOn ? '🎵' : '🎶'}
        </button>
        <button
          className="tool-btn"
          onClick={toggleMute}
          aria-pressed={muted}
          title={muted ? '开启音效（M）' : '静音（M）'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <h1 className="title">俄罗斯方块</h1>
      <p className="sub">TETRIS · V3</p>
      {isTouch && <CompactBar stats={ui} hold={ui.hold} next={ui.next} />}
      <div className="game-shell">
        <div className="board-wrap">
          <BoardCanvas canvasRef={canvasRef} />
          <Overlay
            state={ui.state}
            score={ui.score}
            best={best}
            isNewBest={isNewBest}
            onTapStart={() => {
              if (engine.state === 'ready' || engine.state === 'over') engine.start()
            }}
          />
        </div>
        {!isTouch && (
          <StatsPanel stats={ui} hold={ui.hold} next={ui.next} best={best} isNewBest={isNewBest} />
        )}
      </div>
      <a className="back" href="../../index.html">
        ← 返回方块世界
      </a>
      {isTouch && <TouchControls engine={engine} />}
    </div>
  )
}
