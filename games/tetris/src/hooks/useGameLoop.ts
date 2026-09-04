import { useEffect, useRef } from 'react'

/**
 * requestAnimationFrame 主循环，每帧回调 frame(dt)，dt 为距上一帧的毫秒数。
 * dt 钳到 100ms，防止切后台回来后的巨帧一次推完重力。
 */
export function useGameLoop(frame: (dt: number) => void): void {
  const frameRef = useRef(frame)
  frameRef.current = frame

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      frameRef.current(dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
}
