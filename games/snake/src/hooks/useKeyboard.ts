import { useEffect } from 'react'
import type { Engine } from '../game/engine'
import type { Dir } from '../game/types'

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
}

/**
 * 键盘输入 → 引擎命令。
 * 方向只入引擎的方向队列（每步消费 1 个，防 180° 回头与连按丢输入），
 * 故这里无需按键重复处理，e.repeat 直接忽略。
 * onToggleMute 由外壳注入（M 键）。
 */
export function useKeyboard(engine: Engine, onToggleMute?: () => void): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key]
      if (dir) {
        e.preventDefault()
        if (!e.repeat) engine.turn(dir)
        return
      }
      if (e.key === 'Enter') {
        if (engine.state === 'ready' || engine.state === 'over') {
          e.preventDefault()
          engine.start()
        }
        return
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        engine.togglePause()
        return
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        onToggleMute?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [engine, onToggleMute])
}
