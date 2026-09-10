import { GRID_HEIGHT, GRID_WIDTH, DIR_VECTORS } from './grid'
import { TUNING } from './tuning'
import type { Dir, Point } from './types'

/**
 * 蛇数据模型：头在前、尾在后的坐标数组（snake[0] 为头）。
 * 移动 = 头部入列 + 尾部出列（吃食时尾部不出列）。
 */
export type SnakeBody = Point[]

/** 初始蛇：长度 3、水平居中、朝右（尾在左头在右） */
export function createSnake(): SnakeBody {
  const y = Math.floor(GRID_HEIGHT / 2)
  const headX = Math.floor(GRID_WIDTH / 2)
  return Array.from({ length: TUNING.initialLength }, (_, i) => ({
    x: headX - i,
    y,
  }))
}

/** 沿方向走一步后的新头坐标（不做任何碰撞检查） */
export function nextHead(snake: SnakeBody, dir: Dir): Point {
  const [dx, dy] = DIR_VECTORS[dir]
  const head = snake[0]
  return { x: head.x + dx, y: head.y + dy }
}

/** 走一步：返回新蛇身；grow 为真时尾部不出列（变长） */
export function advance(snake: SnakeBody, dir: Dir, grow: boolean): SnakeBody {
  const keep = grow ? snake.length : snake.length - 1
  const body: SnakeBody = [nextHead(snake, dir)]
  for (let i = 0; i < keep; i++) body.push(snake[i])
  return body
}

/** 蛇头是否已压在身体上（用于事后判定） */
export function hitsSelf(snake: SnakeBody): boolean {
  const [head, ...rest] = snake
  return rest.some((seg) => seg.x === head.x && seg.y === head.y)
}

/**
 * 格子是否被蛇身挡住。tailVacates 为真时排除尾节：
 * 不吃食的步进中尾格会同步让位，追尾进入该格是安全的。
 */
export function blocksCell(
  snake: SnakeBody,
  p: Point,
  tailVacates: boolean,
): boolean {
  const end = tailVacates ? snake.length - 1 : snake.length
  for (let i = 0; i < end; i++) {
    if (snake[i].x === p.x && snake[i].y === p.y) return true
  }
  return false
}
