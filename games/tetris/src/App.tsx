import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
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
  const [viewportHeight, setViewportHeight] = useState(readViewportHeight)

  const toggleMute = useCallback(() => setMuted((m) => !m), [])
  const toggleBgm = useCallback(() => setBgmOn((b) => !b), [])

  useEffect(() => writeFlag(MUTED_KEY, muted), [muted])
  useEffect(() => writeFlag(BGM_KEY, bgmOn), [bgmOn])

  // 锁定手机进入页面时的可用高度，避免浏览器地址栏收放导致棋盘缩放跳动。
  // 只有横竖屏方向真正变化时才重新采样。
  useEffect(() => {
    if (!isTouch) return

    document.documentElement.classList.add('tetris-touch')
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
      document.documentElement.classList.remove('tetris-touch')
      orientation.removeEventListener?.('change', updateAfterRotation)
      window.removeEventListener('orientationchange', updateAfterRotation)
    }
  }, [isTouch])

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
            <>
            <button
              className="tool-btn"
              onClick={() => engine.holdPiece()}
              aria-label="暂存"
              title="暂存 Hold"
            >
              HOLD
            </button>
            <button
              className="tool-btn"
              onClick={() => engine.togglePause()}
              aria-label={ui.state === 'paused' ? '继续' : '暂停'}
              title={ui.state === 'paused' ? '继续游戏' : '暂停游戏'}
            >
              {ui.state === 'paused' ? '▶' : 'Ⅱ'}
            </button>
            </>
          )}
        </div>
        {isTouch && <h1 className="mobile-title">俄罗斯方块</h1>}
        <div className="toolbar-group toolbar-audio">
          <button
            className="tool-btn"
            onClick={toggleBgm}
            aria-label={bgmOn ? '关闭背景音乐' : '开启背景音乐'}
            aria-pressed={bgmOn}
            title={bgmOn ? '关闭 BGM（B）' : '开启 BGM（B）'}
          >
            {bgmOn ? '🎵' : '🎶'}
          </button>
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
          <h1 className="title">俄罗斯方块</h1>
          <p className="sub">TETRIS · V3</p>
        </>
      )}
      {isTouch && <CompactBar stats={ui} hold={ui.hold} next={ui.next} />}
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
            <StatsPanel stats={ui} hold={ui.hold} next={ui.next} best={best} isNewBest={isNewBest} />
          )}
        </div>
        <div className="console-foot">TETRIS</div>
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
