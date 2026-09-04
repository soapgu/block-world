import type { RefObject } from 'react'
import { boardPixelHeight, boardPixelWidth } from '../render/canvas'

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
        style={{ width: boardPixelWidth(), height: boardPixelHeight() }}
      />
    </div>
  )
}
