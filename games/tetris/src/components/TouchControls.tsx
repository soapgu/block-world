import { useEffect, useRef } from 'react'
import type { Engine } from '../game/engine'

/** 移动键长按自动重复间隔（ms），对齐键盘 DAS 语义 */
const REPEAT_MS = 60
/** 长按首次重复前的延迟（ms） */
const REPEAT_DELAY_MS = 200

type RepeatAction = () => void

/**
 * 底部虚拟按键：pointerdown 触发命令，移动键长按自动重复；
 * pointerup/cancel/leave 一律停止。软降按住期间持续生效（与键盘一致）。
 * 只调用引擎命令层，零引擎改动；音效经 GameEvent 自动生效。
 */
export function TouchControls({ engine }: { engine: Engine }) {
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const repeatDelay = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopRepeat = () => {
    if (repeatDelay.current) clearTimeout(repeatDelay.current)
    if (repeatTimer.current) clearInterval(repeatTimer.current)
    repeatDelay.current = null
    repeatTimer.current = null
  }

  useEffect(() => stopRepeat, [])

  /** 单发命令（旋转/硬降/Hold/暂停） */
  const fire = (action: RepeatAction) => (e: React.PointerEvent) => {
    e.preventDefault()
    action()
  }

  /** 可重复命令（左右移动） */
  const fireRepeat = (action: RepeatAction) => (e: React.PointerEvent) => {
    e.preventDefault()
    action()
    stopRepeat()
    repeatDelay.current = setTimeout(() => {
      repeatTimer.current = setInterval(action, REPEAT_MS)
    }, REPEAT_DELAY_MS)
  }

  /** 软降：按下开、抬起关 */
  const softDown = (e: React.PointerEvent) => {
    e.preventDefault()
    engine.setSoftDrop(true)
  }
  const softUp = () => engine.setSoftDrop(false)

  return (
    <div className="touch-controls" onPointerUp={stopRepeat} onPointerCancel={stopRepeat}>
      <div className="tc-cluster">
        <button className="tc-btn" onPointerDown={fireRepeat(() => engine.moveX(-1))} aria-label="左移">
          ←
        </button>
        <button className="tc-btn" onPointerDown={softDown} onPointerUp={softUp} onPointerCancel={softUp} aria-label="软降">
          ↓
        </button>
        <button className="tc-btn" onPointerDown={fireRepeat(() => engine.moveX(1))} aria-label="右移">
          →
        </button>
      </div>
      <button className="tc-btn tc-pause" onPointerDown={fire(() => engine.togglePause())} aria-label="暂停">
        ❚❚
      </button>
      <div className="tc-cluster">
        <button className="tc-btn" onPointerDown={fire(() => engine.holdPiece())} aria-label="暂存">
          ⎋
        </button>
        <button className="tc-btn" onPointerDown={fire(() => engine.hardDrop())} aria-label="硬降">
          ⤓
        </button>
        <button className="tc-btn tc-primary" onPointerDown={fire(() => engine.rotate(1))} aria-label="旋转">
          ↻
        </button>
      </div>
    </div>
  )
}
