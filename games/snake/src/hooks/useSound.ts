import { useEffect } from 'react'
import type { Engine } from '../game/engine'
import { sfx } from '../audio/sfx'

/** 订阅引擎事件播放音效；muted 变化实时生效 */
export function useSound(engine: Engine, muted: boolean): void {
  useEffect(() => {
    return engine.subscribe((event) => sfx.play(event))
  }, [engine])

  useEffect(() => {
    sfx.setMuted(muted)
  }, [muted])
}
