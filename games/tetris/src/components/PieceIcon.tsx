import { PIECE_BOX_SIZE, PIECE_ROTATIONS } from '../game/pieces'
import type { PieceType } from '../game/types'

/** 用 CSS grid 画单个方块的迷你图（Hold/Next 面板用） */
export function PieceIcon({ type }: { type: PieceType }) {
  const size = PIECE_BOX_SIZE[type]
  const cells = PIECE_ROTATIONS[type][0]
  const filled = new Set(cells.map(([x, y]) => y * size + x))
  return (
    <div
      className="piece-icon"
      style={{ gridTemplateColumns: `repeat(${size}, 10px)` }}
      role="img"
      aria-label={`方块 ${type}`}
    >
      {Array.from({ length: size * size }, (_, i) => (
        <div
          key={i}
          className={filled.has(i) ? 'mini-cell on' : 'mini-cell'}
        />
      ))}
    </div>
  )
}
