import { useEffect } from 'react'
import type { Engine, GameEvent } from '../game/engine'
import { sfx } from '../audio/sfx'

/** DAS 连续移动时音效节流间隔（ms），避免嘀嘀声连成一片 */
const MOVE_SFX_INTERVAL = 50

/** 订阅引擎事件播放音效；muted 变化实时生效（BGM 未来也走同一开关） */
export function useSound(engine: Engine, muted: boolean): void {
  useEffect(() => {
    let lastMoveAt = 0
    const onEvent = (event: GameEvent) => {
      if (event.type === 'move') {
        const now = performance.now()
        if (now - lastMoveAt < MOVE_SFX_INTERVAL) return
        lastMoveAt = now
      }
      sfx.play(event)
    }
    engine.onEvent = onEvent
    return () => {
      if (engine.onEvent === onEvent) engine.onEvent = undefined
    }
  }, [engine])

  useEffect(() => {
    sfx.setMuted(muted)
  }, [muted])
}
