import { useEffect } from 'react'
import type { Engine } from '../game/engine'

/**
 * 失焦/切后台自动暂停：playing 时页面失焦即暂停。
 * 只暂停不自动恢复——回来后按 P 继续，避免抢操作。
 */
export function useAutoPause(engine: Engine): void {
  useEffect(() => {
    const pauseIfPlaying = () => {
      if (engine.state === 'playing') engine.togglePause()
    }
    const onVisibility = () => {
      if (document.hidden) pauseIfPlaying()
    }
    window.addEventListener('blur', pauseIfPlaying)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', pauseIfPlaying)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [engine])
}
