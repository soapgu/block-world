import type { RefObject } from 'react'
import { GRID_HEIGHT, GRID_WIDTH } from '../game/grid'

export function BoardCanvas({
  canvasRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
}) {
  return (
    <div className="board-frame">
      <canvas
        ref={canvasRef as RefObject<HTMLCanvasElement>}
        className="board"
        // 宽高比锁定棋盘 20:20；具体显示尺寸由 CSS 响应式控制
        // （物理分辨率固定 480×480×dpr，显示更小时相当于超采样，不损清晰度）
        style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
      />
    </div>
  )
}
