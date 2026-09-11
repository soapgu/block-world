import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BoardCanvas } from './components/BoardCanvas'
import { CompactBar } from './components/CompactBar'
import { Overlay } from './components/Overlay'
import { StatsPanel } from './components/StatsPanel'
import { TouchControls } from './components/TouchControls'
import { Engine } from './game/engine'
import type { UiSnapshot } from './game/engine'
import { useAutoPause } from './hooks/useAutoPause'
import { useBestScore } from './hooks/useBestScore'
import { useGameLoop } from './hooks/useGameLoop'
import { useKeyboard } from './hooks/useKeyboard'
import { useSound } from './hooks/useSound'
import { boardPixelHeight, boardPixelWidth, drawGame } from './render/canvas'

const MUTED_KEY = 'snake:muted'

function readViewportHeight(): number {
  if (typeof window === 'undefined') return 800
  return Math.round(window.visualViewport?.height ?? window.innerHeight)
}

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
    a.length === b.length &&
    a.state === b.state
  )
}

export default function App() {
  const engineRef = useRef<Engine | null>(null)
  if (!engineRef.current) engineRef.current = new Engine()
  const engine = engineRef.current

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ui, setUi] = useState<UiSnapshot>(() => engine.getUiSnapshot())
  const [muted, setMuted] = useState(() => readFlag(MUTED_KEY))
  const [best, isNewBest] = useBestScore(engine)
  // 触屏设备才渲染虚拟按键与精简信息条（CSS 断点控制具体布局）
  const [isTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  const [viewportHeight, setViewportHeight] = useState(readViewportHeight)

  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  useEffect(() => writeFlag(MUTED_KEY, muted), [muted])

  // 锁定手机进入页面时的可用高度，避免浏览器地址栏收放导致棋盘缩放跳动。
  // 只有横竖屏方向真正变化时才重新采样。
  useEffect(() => {
    if (!isTouch) return

    document.documentElement.classList.add('snake-touch')
    const orientation = window.matchMedia('(orientation: portrait)')
    let timer: ReturnType<typeof setTimeout> | null = null
    const updateAfterRotation = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setViewportHeight(readViewportHeight()), 150)
    }

    orientation.addEventListener?.('change', updateAfterRotation)
    window.addEventListener('orientationchange', updateAfterRotation)
    return () => {
      if (timer) clearTimeout(timer)
      document.documentElement.classList.remove('snake-touch')
      orientation.removeEventListener?.('change', updateAfterRotation)
      window.removeEventListener('orientationchange', updateAfterRotation)
    }
  }, [isTouch])

  // 按设备像素比设置画布物理尺寸，保证高清屏下清晰
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = boardPixelWidth() * dpr
    canvas.height = boardPixelHeight() * dpr
  }, [])

  useKeyboard(engine, toggleMute)
  useSound(engine, muted)
  useAutoPause(engine)

  useGameLoop((dt) => {
    engine.update(dt)

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawGame(ctx, engine, performance.now())
    }

    // 引擎数据在 ref 里，这里只在变化时同步进 React（避免每帧重渲染外壳）
    const snapshot = engine.getUiSnapshot()
    setUi((prev) => (sameUi(prev, snapshot) ? prev : snapshot))
  })

  return (
    <div
      className={isTouch ? 'page touch' : 'page'}
      style={
        isTouch
          ? ({ '--game-viewport-height': `${viewportHeight}px` } as CSSProperties)
          : undefined
      }
    >
      <div className="toolbar">
        <div className="toolbar-group toolbar-game">
          {isTouch && (
            <button
              className="tool-btn"
              onClick={() => engine.togglePause()}
              aria-label={ui.state === 'paused' ? '继续' : '暂停'}
              title={ui.state === 'paused' ? '继续游戏' : '暂停游戏'}
            >
              {ui.state === 'paused' ? '▶' : 'Ⅱ'}
            </button>
          )}
        </div>
        {isTouch && <h1 className="mobile-title">贪吃蛇</h1>}
        <div className="toolbar-group toolbar-audio">
          <button
            className="tool-btn"
            onClick={toggleMute}
            aria-label={muted ? '开启音效' : '关闭音效'}
            aria-pressed={muted}
            title={muted ? '开启音效（M）' : '静音（M）'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
      {!isTouch && (
        <>
          <h1 className="title">贪吃蛇</h1>
          <p className="sub">SNAKE · V3</p>
        </>
      )}
      {isTouch && <CompactBar stats={ui} best={best} />}
      <div className="console-body">
        <div className="console-brand">
          <span className="console-screw" aria-hidden="true" />
          <span className="console-print">BRICK WORLD</span>
          <span className="console-screw" aria-hidden="true" />
        </div>
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
            <StatsPanel stats={ui} best={best} isNewBest={isNewBest} />
          )}
        </div>
        <div className="console-foot">SNAKE</div>
      </div>
      {/* 触屏端隐藏返回链接：固定按键区占据底部，浏览器返回手势可达首页 */}
      {!isTouch && (
        <a className="back" href="../../index.html">
          ← 返回方块世界
        </a>
      )}
      {isTouch && <TouchControls engine={engine} />}
    </div>
  )
}
