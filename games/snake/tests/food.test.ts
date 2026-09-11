import { describe, expect, it } from 'vitest'
import { spawnBonusFood, spawnFood } from '../src/game/food'
import { GRID_HEIGHT, GRID_WIDTH } from '../src/game/grid'
import type { SnakeBody } from '../src/game/snake'

function onSnake(snake: SnakeBody, p: { x: number; y: number }): boolean {
  return snake.some((s) => s.x === p.x && s.y === p.y)
}

describe('spawnFood', () => {
  it('永不落在蛇身上（大量随机采样）', () => {
    const snake: SnakeBody = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]
    for (let i = 0; i < 500; i++) {
      const food = spawnFood(snake)
      expect(food).not.toBeNull()
      expect(onSnake(snake, food!)).toBe(false)
      expect(food!.x).toBeGreaterThanOrEqual(0)
      expect(food!.x).toBeLessThan(GRID_WIDTH)
      expect(food!.y).toBeGreaterThanOrEqual(0)
      expect(food!.y).toBeLessThan(GRID_HEIGHT)
    }
  })

  it('注入固定 rng 结果可复现：rng=0 取第一个空闲格 (0,0)', () => {
    const snake: SnakeBody = [{ x: 10, y: 10 }]
    expect(spawnFood(snake, () => 0)).toEqual({ x: 0, y: 0 })
  })

  it('注入 rng=1（钳到上界）取最后一个空闲格', () => {
    const snake: SnakeBody = [
      { x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 },
      { x: GRID_WIDTH - 2, y: GRID_HEIGHT - 1 },
    ]
    // 蛇占掉最后两格，空闲末格变为 (GRID_WIDTH-3, 最后一行)
    expect(spawnFood(snake, () => 1)).toEqual({
      x: GRID_WIDTH - 3,
      y: GRID_HEIGHT - 1,
    })
  })

  it('棋盘全满返回 null', () => {
    const full: SnakeBody = []
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) full.push({ x, y })
    }
    expect(spawnFood(full, () => 0)).toBeNull()
  })

  it('仅剩一个空闲格时必然取到该格（无论 rng）', () => {
    const almostFull: SnakeBody = []
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (y === 0 && x === 0) continue
        almostFull.push({ x, y })
      }
    }
    expect(spawnFood(almostFull, () => 0.999)).toEqual({ x: 0, y: 0 })
  })
})

describe('spawnBonusFood', () => {
  it('避开蛇身与现有普通食物（大量随机采样）', () => {
    const snake: SnakeBody = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]
    const food = { x: 0, y: 0 }
    for (let i = 0; i < 500; i++) {
      const bonus = spawnBonusFood(snake, food)
      expect(bonus).not.toBeNull()
      expect(onSnake(snake, bonus!)).toBe(false)
      expect(bonus!.x === 0 && bonus!.y === 0).toBe(false)
    }
  })

  it('注入固定 rng 结果可复现：rng=0 取第一个同时避开蛇与食物的空闲格', () => {
    const snake: SnakeBody = [{ x: 10, y: 10 }]
    const food = { x: 0, y: 0 }
    // (0,0) 被普通食物占用，第一个空闲格变为 (1,0)
    expect(spawnBonusFood(snake, food, () => 0)).toEqual({ x: 1, y: 0 })
  })

  it('空闲格仅剩普通食物位置时返回 null', () => {
    const snake: SnakeBody = []
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (x === 0 && y === 0) continue
        snake.push({ x, y })
      }
    }
    expect(spawnBonusFood(snake, { x: 0, y: 0 }, () => 0)).toBeNull()
  })
})
