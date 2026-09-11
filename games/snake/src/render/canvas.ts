import { GRID_HEIGHT, GRID_WIDTH } from '../game/grid'
import type { Engine } from '../game/engine'

/** 棋盘渲染的单格像素尺寸 */
export const CELL_SIZE = 24

/** 食物闪烁周期（ms） */
const FOOD_BLINK_MS = 300
/** 奖励食物闪烁周期（ms） */
const BONUS_BLINK_MS = 150
/** 奖励食物临期（剩余不足此时长）加速闪烁 */
const BONUS_URGENT_MS = 1500

const COLORS = {
  /** 液晶底：中心稍亮的 LCD 绿（背光不均感） */
  background: '#041a04',
  backgroundCenter: '#06280a',
  grid: '#0a3a0a',
  /** 熄灭段：每个格子都隐约可见的液晶残影 */
  offCell: 'rgba(57, 255, 110, 0.045)',
  body: '#2f9e44',
  head: '#39ff6e',
  headBorder: '#0a3a0a',
  food: '#9fff9f',
  bonus: '#d4ffd4',
} as const

export function boardPixelWidth(): number {
  return GRID_WIDTH * CELL_SIZE
}

export function boardPixelHeight(): number {
  return GRID_HEIGHT * CELL_SIZE
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
): void {
  const px = x * CELL_SIZE
  const py = y * CELL_SIZE
  // 液晶段：格子四周留出明显间隙，露出底色
  ctx.fillStyle = fill
  ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4)
  ctx.strokeStyle = COLORS.headBorder
  ctx.lineWidth = 2
  ctx.strokeRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8)
}

/**
 * 每帧全量重绘：底色渐变 → 熄灭段残影 → 网格 → 食物（闪烁）→ 蛇身 → 蛇头。
 * nowMs 用于食物闪烁计时。
 */
export function drawGame(
  ctx: CanvasRenderingContext2D,
  engine: Engine,
  nowMs: number,
): void {
  const w = boardPixelWidth()
  const h = boardPixelHeight()

  // LCD 底色：径向渐变，中心稍亮（背光不均）
  const bg = ctx.createRadialGradient(w / 2, h / 3, 0, w / 2, h / 3, h * 0.8)
  bg.addColorStop(0, COLORS.backgroundCenter)
  bg.addColorStop(1, COLORS.background)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // 熄灭段残影：每个格子一个极淡方格（点阵液晶的物理特征）
  ctx.fillStyle = COLORS.offCell
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)
    }
  }

  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < GRID_WIDTH; x++) {
    ctx.moveTo(x * CELL_SIZE + 0.5, 0)
    ctx.lineTo(x * CELL_SIZE + 0.5, h)
  }
  for (let y = 1; y < GRID_HEIGHT; y++) {
    ctx.moveTo(0, y * CELL_SIZE + 0.5)
    ctx.lineTo(w, y * CELL_SIZE + 0.5)
  }
  ctx.stroke()

  // 食物：像素闪烁（半周期显示）
  if (engine.food && Math.floor(nowMs / FOOD_BLINK_MS) % 2 === 0) {
    drawCell(ctx, engine.food.x, engine.food.y, COLORS.food)
  }

  // 奖励食物：快闪，临期时再加速（营造紧迫感）
  if (engine.bonus) {
    const urgent = engine.bonus.timer <= BONUS_URGENT_MS
    const period = urgent ? BONUS_BLINK_MS / 2 : BONUS_BLINK_MS
    if (Math.floor(nowMs / period) % 2 === 0) {
      drawCell(ctx, engine.bonus.point.x, engine.bonus.point.y, COLORS.bonus)
    }
  }

  // 蛇身（跳过头部，头部单独亮色绘制）
  for (let i = 1; i < engine.snake.length; i++) {
    const seg = engine.snake[i]
    drawCell(ctx, seg.x, seg.y, COLORS.body)
  }
  // 蛇头：亮绿 + 描边区分
  const head = engine.snake[0]
  if (head) drawCell(ctx, head.x, head.y, COLORS.head)
}
