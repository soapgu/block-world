export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

/** 棋盘格子：null 为空，否则记录占用它的方块类型 */
export type Cell = PieceType | null

/** board[行][列]，行 0 在顶部 */
export type Board = Cell[][]

/** 场地尺寸（经典 Brick Game 为 10×20） */
export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20

export interface Piece {
  type: PieceType
  /** 旋转态 0~3 */
  rotation: number
  /** 包围盒左上角在棋盘上的列 */
  x: number
  /** 包围盒左上角在棋盘上的行，可为负（出生时部分格子悬在场外） */
  y: number
}

export type EngineState = 'ready' | 'playing' | 'paused' | 'over'

export interface Stats {
  score: number
  lines: number
  level: number
}
