import { GRID_HEIGHT, GRID_WIDTH } from '../game/grid'
import type { SnakeBody } from './snake'
import type { Point } from './types'

/** 随机源：默认 Math.random，测试可注入固定序列 */
export type Rng = () => number

function randomFreeCell(
  occupied: Set<number>,
  rng: Rng,
): Point | null {
  const free: number[] = []
  for (let i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
    if (!occupied.has(i)) free.push(i)
  }
  if (free.length === 0) return null
  // rng() 理论上可能返回 1（注入的假随机源），钳住防越界
  const pick = Math.min(free.length - 1, Math.floor(rng() * free.length))
  const idx = free[pick]
  return { x: idx % GRID_WIDTH, y: Math.floor(idx / GRID_WIDTH) }
}

/**
 * 随机生成一个食物，永不落在蛇身上。
 * 空闲格耗尽（蛇填满棋盘）返回 null，由调用方结束游戏。
 */
export function spawnFood(snake: SnakeBody, rng: Rng = Math.random): Point | null {
  const occupied = new Set(snake.map((p) => p.y * GRID_WIDTH + p.x))
  return randomFreeCell(occupied, rng)
}

/**
 * 随机生成一个奖励食物，避开蛇身与现有普通食物。
 * 无空闲格时返回 null（调用方放弃本次奖励）。
 */
export function spawnBonusFood(
  snake: SnakeBody,
  food: Point,
  rng: Rng = Math.random,
): Point | null {
  const occupied = new Set(snake.map((p) => p.y * GRID_WIDTH + p.x))
  occupied.add(food.y * GRID_WIDTH + food.x)
  return randomFreeCell(occupied, rng)
}
