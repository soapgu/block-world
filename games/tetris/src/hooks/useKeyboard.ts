import { useEffect } from 'react'
import type { Engine } from '../game/engine'
import { TUNING } from '../game/tuning'

const TRACKED_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowDown',
  'ArrowUp',
  ' ',
  'Enter',
  'p',
  'P',
  'Shift',
  'c',
  'C',
])

/**
 * 键盘输入 → 引擎命令。
 * 左右长按走自实现的 DAS（首延迟 + 自动重复），不依赖系统按键重复率。
 */
export function useKeyboard(engine: Engine): void {
  useEffect(() => {
    let dasDir: -1 | 0 | 1 = 0
    let dasDelay: ReturnType<typeof setTimeout> | null = null
    let dasRepeat: ReturnType<typeof setInterval> | null = null

    const stopDas = () => {
      if (dasDelay) clearTimeout(dasDelay)
      if (dasRepeat) clearInterval(dasRepeat)
      dasDelay = null
      dasRepeat = null
      dasDir = 0
    }

    const startDas = (dir: -1 | 1) => {
      stopDas()
      dasDir = dir
      dasDelay = setTimeout(() => {
        dasRepeat = setInterval(() => engine.moveX(dir), TUNING.dasRepeat)
      }, TUNING.dasInitialDelay)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!TRACKED_KEYS.has(e.key)) return
      e.preventDefault()
      if (e.repeat) return
      switch (e.key) {
        case 'ArrowLeft':
          engine.moveX(-1)
          startDas(-1)
          break
        case 'ArrowRight':
          engine.moveX(1)
          startDas(1)
          break
        case 'ArrowDown':
          engine.setSoftDrop(true)
          break
        case 'ArrowUp':
          engine.rotate()
          break
        case ' ':
          engine.hardDrop()
          break
        case 'Shift':
        case 'c':
        case 'C':
          engine.holdPiece()
          break
        case 'p':
        case 'P':
          engine.togglePause()
          break
        case 'Enter':
          if (engine.state === 'ready' || engine.state === 'over') {
            engine.start()
          }
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          if (dasDir === -1) stopDas()
          break
        case 'ArrowRight':
          if (dasDir === 1) stopDas()
          break
        case 'ArrowDown':
          engine.setSoftDrop(false)
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      stopDas()
      engine.setSoftDrop(false)
    }
  }, [engine])
}
