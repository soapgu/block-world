import { useEffect, useRef, useState } from 'react'
import { BoardCanvas } from './components/BoardCanvas'
import { Overlay } from './components/Overlay'
import { StatsPanel } from './components/StatsPanel'
import { Engine } from './game/engine'
import type { UiSnapshot } from './game/engine'
import { useGameLoop } from './hooks/useGameLoop'
import { useKeyboard } from './hooks/useKeyboard'
import { boardPixelHeight, boardPixelWidth, drawGame } from './render/canvas'

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

  // 按设备像素比设置画布物理尺寸，保证高清屏下清晰
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = boardPixelWidth() * dpr
    canvas.height = boardPixelHeight() * dpr
  }, [])

  useKeyboard(engine)

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
    <div className="page">
      <h1 className="title">俄罗斯方块</h1>
      <p className="sub">TETRIS · V2</p>
      <div className="game-shell">
        <div className="board-wrap">
          <BoardCanvas canvasRef={canvasRef} />
          <Overlay state={ui.state} score={ui.score} />
        </div>
        <StatsPanel stats={ui} hold={ui.hold} next={ui.next} />
      </div>
      <a className="back" href="../../index.html">
        ← 返回方块世界
      </a>
    </div>
  )
}
