import type { RefObject } from 'react'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../game/types'

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
        // 宽高比锁定棋盘 10:20；具体显示尺寸由 CSS 响应式控制
        // （物理分辨率固定 240×480×dpr，显示更小时相当于超采样，不损清晰度）
        style={{ aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}` }}
      />
    </div>
  )
}
