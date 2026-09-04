import { useEffect, useRef, useState } from 'react'
import { BoardCanvas } from './components/BoardCanvas'
import { Overlay } from './components/Overlay'
import { StatsPanel } from './components/StatsPanel'
import { Engine } from './game/engine'
import type { EngineState, Stats } from './game/types'
import { useGameLoop } from './hooks/useGameLoop'
import { useKeyboard } from './hooks/useKeyboard'
import { boardPixelHeight, boardPixelWidth, drawGame } from './render/canvas'

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  if (!engineRef.current) engineRef.current = new Engine()
  const engine = engineRef.current

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stats, setStats] = useState<Stats>(() => engine.getStats())
  const [state, setState] = useState<EngineState>(engine.state)

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
    const next = engine.getStats()
    setStats((prev) =>
      prev.score === next.score &&
      prev.lines === next.lines &&
      prev.level === next.level
        ? prev
        : next,
    )
    setState((prev) => (prev === engine.state ? prev : engine.state))
  })

  return (
    <div className="page">
      <h1 className="title">俄罗斯方块</h1>
      <p className="sub">TETRIS · V1</p>
      <div className="game-shell">
        <div className="board-wrap">
          <BoardCanvas canvasRef={canvasRef} />
          <Overlay state={state} score={stats.score} />
        </div>
        <StatsPanel stats={stats} />
      </div>
      <a className="back" href="../../index.html">
        ← 返回方块世界
      </a>
    </div>
  )
}
