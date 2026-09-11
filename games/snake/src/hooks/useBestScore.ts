import { useEffect, useRef, useState } from 'react'
import type { Engine, GameEvent } from '../game/engine'

const BEST_KEY = 'snake:best'

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

/**
 * 本地最高分：订阅 gameOver 事件比较写入，
 * 返回 [best, isNewBest]——isNewBest 在本局刚破纪录时为 true（重开后复位）。
 */
export function useBestScore(engine: Engine): [number, boolean] {
  const [best, setBest] = useState(readBest)
  const [isNewBest, setIsNewBest] = useState(false)
  const prevBest = useRef(best)

  useEffect(() => {
    const onEvent = (event: GameEvent) => {
      if (event.type !== 'gameOver') return
      const score = engine.score
      if (score > prevBest.current) {
        prevBest.current = score
        setBest(score)
        setIsNewBest(true)
        try {
          localStorage.setItem(BEST_KEY, String(score))
        } catch {
          // 隐私模式等场景下写入失败可接受
        }
      }
    }
    return engine.subscribe(onEvent)
  }, [engine])

  // 开新一局时清除"新纪录"标记
  useEffect(() => {
    if (engine.state === 'playing' && isNewBest) setIsNewBest(false)
  })

  return [best, isNewBest]
}
