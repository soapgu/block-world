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

/** 消除已填满的行，空行从顶部补入。返回新棋盘与被消除的行号。 */
export function clearLines(board: Board): {
  board: Board
  clearedRows: number[]
} {
  const clearedRows: number[] = []
  const kept: Board = []
  for (let y = 0; y < board.length; y++) {
    if (board[y].every((cell) => cell !== null)) clearedRows.push(y)
    else kept.push(board[y])
  }
  if (clearedRows.length === 0) return { board, clearedRows }
  const empty = Array.from({ length: clearedRows.length }, () =>
    Array<Cell>(BOARD_WIDTH).fill(null),
  )
  return { board: [...empty, ...kept], clearedRows }
}

/**
 * T-Spin 三角判定：T 块、最后一次成功操作为旋转，
 * 且包围盒四个角中至少 3 个被占（已锁定的块、墙、底部都算占用）。
 */
export function isTSpin(
  board: Board,
  piece: Piece,
  lastActionWasRotation: boolean,
): boolean {
  if (piece.type !== 'T' || !lastActionWasRotation) return false
  const corners: Array<readonly [number, number]> = [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ]
  let occupied = 0
  for (const [cx, cy] of corners) {
    const x = piece.x + cx
    const y = piece.y + cy
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      occupied += 1
      continue
    }
    if (y >= 0 && board[y][x] !== null) occupied += 1
  }
  return occupied >= 3
}
