import { pieceCells } from './pieces'
import { BOARD_HEIGHT, BOARD_WIDTH } from './types'
import type { Board, Cell, Piece } from './types'

type Cells = ReadonlyArray<readonly [number, number]>

export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array<Cell>(BOARD_WIDTH).fill(null),
  )
}

/**
 * 判断一组绝对坐标是否与棋盘冲突：
 * 左右越界、超出底部为冲突；行号小于 0（场外上方）只查横向越界。
 */
export function collides(board: Board, cells: Cells): boolean {
  for (const [x, y] of cells) {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return true
    if (y >= 0 && board[y][x] !== null) return true
  }
  return false
}

/** 方块在无碰撞前提下最多还能下落的格数（Ghost 投影距离） */
export function ghostDrop(board: Board, piece: Piece): number {
  let drop = 0
  while (!collides(board, pieceCells({ ...piece, y: piece.y + drop + 1 }))) {
    drop += 1
  }
  return drop
}

/** 将方块固定入盘（返回新棋盘）。toppedOut 表示有格子悬在场地顶边之上（堆顶溢出）。 */
export function lockPiece(
  board: Board,
  piece: Piece,
): { board: Board; toppedOut: boolean } {
  const next = board.map((row) => row.slice())
  let toppedOut = false
  for (const [x, y] of pieceCells(piece)) {
    if (y < 0) {
      toppedOut = true
      continue
    }
    next[y][x] = piece.type
  }
  return { board: next, toppedOut }
}

/** 消除已填满的行，空行从顶部补入。返回新棋盘与消除行数。 */
export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((cell) => cell === null))
  const cleared = board.length - kept.length
  if (cleared === 0) return { board, cleared }
  const empty = Array.from({ length: cleared }, () =>
    Array<Cell>(BOARD_WIDTH).fill(null),
  )
  return { board: [...empty, ...kept], cleared }
}
