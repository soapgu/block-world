import type { Engine } from '../game/engine'
import type { Dir } from '../game/types'

/**
 * 底部虚拟按键：十字方向键一簇（↑←↓→）。
 * 方向键单击即转向（引擎方向队列自然缓冲），无长按重复；
 * 暂停收在顶部工具栏。
 */
export function TouchControls({ engine }: { engine: Engine }) {
  const turn = (dir: Dir) => (e: React.PointerEvent) => {
    e.preventDefault()
    engine.turn(dir)
  }

  return (
    <div className="touch-controls">
      <div className="tc-deck">
        <div className="tc-direction" aria-label="方向控制">
          <button className="tc-btn" onPointerDown={turn('up')} aria-label="向上">
            ↑
          </button>
          <div className="tc-direction-row">
            <button className="tc-btn" onPointerDown={turn('left')} aria-label="向左">
              ←
            </button>
            <button className="tc-btn" onPointerDown={turn('down')} aria-label="向下">
              ↓
            </button>
            <button className="tc-btn" onPointerDown={turn('right')} aria-label="向右">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
