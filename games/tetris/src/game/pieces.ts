import type { Piece, PieceType } from './types'

type Cells = ReadonlyArray<readonly [number, number]>

interface BaseShape {
  /** 包围盒边长 */
  size: number
  /** 旋转态 0 的格子偏移（列, 行），行向下增大 */
  cells: Cells
}

/** 7 种四连方块的出生形态（旋转态 0） */
const BASE: Record<PieceType, BaseShape> = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[0, 1], [1, 1], [2, 1], [1, 0]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
}

/** 包围盒边长（旋转计算用） */
export const PIECE_BOX_SIZE: Record<PieceType, number> = {
  I: BASE.I.size,
  O: BASE.O.size,
  T: BASE.T.size,
  S: BASE.S.size,
  Z: BASE.Z.size,
  J: BASE.J.size,
  L: BASE.L.size,
}

/** 顺时针旋转 90°：(x, y) → (size-1-y, x) */
function rotateCW(cells: Cells, size: number): Array<[number, number]> {
  return cells.map(([x, y]) => [size - 1 - y, x])
}

/** 预计算每种方块 4 个旋转态的格子偏移 */
export const PIECE_ROTATIONS: Record<PieceType, Cells[]> = (() => {
  const result = {} as Record<PieceType, Cells[]>
  for (const type of Object.keys(BASE) as PieceType[]) {
    const { size, cells } = BASE[type]
    const rotations: Cells[] = [cells]
    for (let i = 1; i < 4; i++) {
      rotations.push(rotateCW(rotations[i - 1], size))
    }
    result[type] = rotations
  }
  return result
})()

/** 方块在某棋盘位置上占用的绝对坐标列表 */
export function pieceCells(piece: Piece): Array<[number, number]> {
  return PIECE_ROTATIONS[piece.type][((piece.rotation % 4) + 4) % 4].map(
    ([cx, cy]) => [piece.x + cx, piece.y + cy] as [number, number],
  )
}
