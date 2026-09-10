import { describe, expect, it } from 'vitest'
import {
  advance,
  blocksCell,
  createSnake,
  hitsSelf,
  nextHead,
} from '../src/game/snake'

describe('createSnake', () => {
  it('初始长度 3，头 (10,10) 在右、尾在左，同一行', () => {
    const snake = createSnake()
    expect(snake).toHaveLength(3)
    expect(snake[0]).toEqual({ x: 10, y: 10 })
    expect(snake[1]).toEqual({ x: 9, y: 10 })
    expect(snake[2]).toEqual({ x: 8, y: 10 })
  })
})

describe('nextHead', () => {
  it('按方向位移一步', () => {
    const snake = createSnake()
    expect(nextHead(snake, 'up')).toEqual({ x: 10, y: 9 })
    expect(nextHead(snake, 'down')).toEqual({ x: 10, y: 11 })
    expect(nextHead(snake, 'left')).toEqual({ x: 9, y: 10 })
    expect(nextHead(snake, 'right')).toEqual({ x: 11, y: 10 })
  })
})

describe('advance', () => {
  it('普通移动：头入列、尾出列，长度不变', () => {
    const snake = advance(createSnake(), 'right', false)
    expect(snake).toHaveLength(3)
    expect(snake[0]).toEqual({ x: 11, y: 10 })
    expect(snake[2]).toEqual({ x: 9, y: 10 })
  })

  it('吃食增长：头入列、尾保留，长度 +1', () => {
    const snake = advance(createSnake(), 'right', true)
    expect(snake).toHaveLength(4)
    expect(snake[0]).toEqual({ x: 11, y: 10 })
    expect(snake[3]).toEqual({ x: 8, y: 10 })
  })

  it('返回新数组，不修改原蛇', () => {
    const original = createSnake()
    advance(original, 'right', true)
    expect(original).toHaveLength(3)
    expect(original[0]).toEqual({ x: 10, y: 10 })
  })
})

describe('hitsSelf', () => {
  it('头压身体为真', () => {
    const snake = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 5 },
    ]
    expect(hitsSelf(snake)).toBe(true)
  })

  it('正常蛇身为假', () => {
    expect(hitsSelf(createSnake())).toBe(false)
  })
})

describe('blocksCell', () => {
  it('撞身体中段为真', () => {
    const snake = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 11, y: 9 },
      { x: 10, y: 9 },
      { x: 9, y: 9 },
    ]
    expect(blocksCell(snake, { x: 10, y: 9 }, false)).toBe(true)
    expect(blocksCell(snake, { x: 12, y: 9 }, false)).toBe(false)
  })

  it('tailVacates 为真时尾格不阻挡（追尾安全）', () => {
    const snake = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 11, y: 9 },
      { x: 10, y: 9 },
    ]
    expect(blocksCell(snake, { x: 10, y: 9 }, true)).toBe(false)
    // 非尾身体仍阻挡
    expect(blocksCell(snake, { x: 11, y: 9 }, true)).toBe(true)
  })
})
