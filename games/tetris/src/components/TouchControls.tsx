import { useEffect, useRef } from 'react'
import type { Engine } from '../game/engine'

/** 移动键长按自动重复间隔（ms），对齐键盘 DAS 语义 */
const REPEAT_MS = 60
/** 长按首次重复前的延迟（ms） */
const REPEAT_DELAY_MS = 200
/** 两次向下按键在此时间内连续按下，触发硬降 */
const DOWN_DOUBLE_TAP_MS = 300

type RepeatAction = () => void

/**
 * 底部虚拟按键（经典掌机混合布局）：
 * 左侧倒 T 形方向区，右侧大旋转键；双击向下硬降，Hold 与暂停收在顶部工具栏。
 * pointerdown 触发命令，移动键长按自动重复；pointerup/cancel 一律停止。
 * 软降按住期间持续生效（与键盘语义一致）；只调用引擎命令层，零引擎改动。
 */
export function TouchControls({ engine }: { engine: Engine }) {
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const repeatDelay = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDownPress = useRef(0)
  const downPointerActive = useRef(false)

  const stopRepeat = () => {
    if (repeatDelay.current) clearTimeout(repeatDelay.current)
    if (repeatTimer.current) clearInterval(repeatTimer.current)
    repeatDelay.current = null
    repeatTimer.current = null
  }

  const stopAll = () => {
    stopRepeat()
    engine.setSoftDrop(false)
  }

  const cancelGesture = () => {
    const cancelledDuringDown = downPointerActive.current
    downPointerActive.current = false
    stopAll()
    if (cancelledDuringDown) lastDownPress.current = 0
  }

  useEffect(
    () => () => {
      stopRepeat()
      engine.setSoftDrop(false)
      lastDownPress.current = 0
      downPointerActive.current = false
    },
    [engine],
  )

  /** 单发命令（旋转） */
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

  /** 按住软降；300ms 内连续按下两次则改为硬降 */
  const softDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (engine.state !== 'playing') {
      lastDownPress.current = 0
      downPointerActive.current = false
      engine.setSoftDrop(false)
      return
    }

    downPointerActive.current = true
    const now = performance.now()
    if (lastDownPress.current > 0 && now - lastDownPress.current <= DOWN_DOUBLE_TAP_MS) {
      lastDownPress.current = 0
      downPointerActive.current = false
      engine.setSoftDrop(false)
      engine.hardDrop()
      return
    }

    lastDownPress.current = now
    engine.setSoftDrop(true)
  }
  const softUp = () => {
    downPointerActive.current = false
    engine.setSoftDrop(false)
  }

  return (
    <div
      className="touch-controls"
      onPointerUp={stopAll}
      onPointerCancel={cancelGesture}
      onPointerLeave={cancelGesture}
    >
      <div className="tc-deck">
        <div className="tc-direction" aria-label="方向控制">
          <div className="tc-direction-row">
            <button className="tc-btn" onPointerDown={fireRepeat(() => engine.moveX(-1))} aria-label="左移">
              ←
            </button>
            <button className="tc-btn" onPointerDown={fireRepeat(() => engine.moveX(1))} aria-label="右移">
              →
            </button>
          </div>
          <button
            className="tc-btn tc-down"
            onPointerDown={softDown}
            onPointerUp={softUp}
            aria-label="软降，双击硬降"
          >
            <span>↓</span>
            <span className="tc-down-hint">×2 硬降</span>
          </button>
        </div>
        <div className="tc-actions">
          <button className="tc-btn tc-rotate" onPointerDown={fire(() => engine.rotate(1))} aria-label="旋转">
            <span className="tc-action-icon">↻</span>
            <span className="tc-action-label">旋转</span>
          </button>
        </div>
      </div>
    </div>
  )
}
