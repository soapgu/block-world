import { pieceCells } from '../game/pieces'
import { ghostDrop } from '../game/board'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../game/types'
import type { Engine } from '../game/engine'

/** 棋盘渲染的单格像素尺寸 */
export const CELL_SIZE = 24

const COLORS = {
  background: '#041a04',
  grid: '#0a3a0a',
  locked: '#2f9e44',
  active: '#39ff6e',
  activeBorder: '#0a3a0a',
  ghost: '#2f9e44',
} as const

export function boardPixelWidth(): number {
  return BOARD_WIDTH * CELL_SIZE
}

export function boardPixelHeight(): number {
  return BOARD_HEIGHT * CELL_SIZE
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
): void {
  const px = x * CELL_SIZE
  const py = y * CELL_SIZE
  ctx.fillStyle = fill
  ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2)
  // 内侧一圈深色描边，做出点阵液晶的格子感
  ctx.strokeStyle = COLORS.activeBorder
  ctx.lineWidth = 2
  ctx.strokeRect(px + 3, py + 3, CELL_SIZE - 6, CELL_SIZE - 6)
}

/** 每帧全量重绘：背景 → 网格 → 已锁定块 → 当前方块 */
export function drawGame(ctx: CanvasRenderingContext2D, engine: Engine): void {
  const w = boardPixelWidth()
  const h = boardPixelHeight()

  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < BOARD_WIDTH; x++) {
    ctx.moveTo(x * CELL_SIZE + 0.5, 0)
    ctx.lineTo(x * CELL_SIZE + 0.5, h)
  }
  for (let y = 1; y < BOARD_HEIGHT; y++) {
    ctx.moveTo(0, y * CELL_SIZE + 0.5)
    ctx.lineTo(w, y * CELL_SIZE + 0.5)
  }
  ctx.stroke()

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = engine.board[y][x]
      if (cell !== null) drawCell(ctx, x, y, COLORS.locked)
    }
  }

  // Ghost 幽灵块：当前方块落点的空心投影
  if (engine.piece && engine.state === 'playing') {
    const drop = ghostDrop(engine.board, engine.piece)
    if (drop > 0) {
      ctx.strokeStyle = COLORS.ghost
      ctx.lineWidth = 2
      for (const [x, y] of pieceCells(engine.piece)) {
        const gy = y + drop
        if (gy < 0) continue
        ctx.strokeRect(
          x * CELL_SIZE + 3,
          gy * CELL_SIZE + 3,
          CELL_SIZE - 6,
          CELL_SIZE - 6,
        )
      }
    }
  }

  if (engine.piece) {
    for (const [x, y] of pieceCells(engine.piece)) {
      if (y >= 0) drawCell(ctx, x, y, COLORS.active)
    }
  }
}
