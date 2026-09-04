import { describe, expect, it } from 'vitest'
import {
  PIECE_BOX_SIZE,
  PIECE_ROTATIONS,
  pieceCells,
} from '../src/game/pieces'
import type { PieceType } from '../src/game/types'

const ALL_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

function keyOf(cells: ReadonlyArray<readonly [number, number]>): string {
  return cells.map(([x, y]) => `${x},${y}`).sort().join(' ')
}

describe('PIECE_ROTATIONS', () => {
  it('每种方块的每个旋转态恰好 4 格且互不重复', () => {
    for (const type of ALL_TYPES) {
      for (const cells of PIECE_ROTATIONS[type]) {
        expect(cells).toHaveLength(4)
        expect(new Set(cells.map(([x, y]) => `${x},${y}`)).size).toBe(4)
      }
    }
  })

  it('所有格子都在各自包围盒内', () => {
    for (const type of ALL_TYPES) {
      const size = PIECE_BOX_SIZE[type]
      for (const cells of PIECE_ROTATIONS[type]) {
        for (const [x, y] of cells) {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(size)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(y).toBeLessThan(size)
        }
      }
    }
  })

  it('顺时针旋转 T 一次后竖条朝下、凸头朝右', () => {
    expect(keyOf(PIECE_ROTATIONS.T[1])).toBe(keyOf([[1, 0], [1, 1], [1, 2], [2, 1]]))
  })

  it('顺时针旋转 I 一次后变为竖条', () => {
    expect(keyOf(PIECE_ROTATIONS.I[1])).toBe(keyOf([[2, 0], [2, 1], [2, 2], [2, 3]]))
  })

  it('O 形方块四个旋转态相同（旋转无效果）', () => {
    const first = keyOf(PIECE_ROTATIONS.O[0])
    for (const cells of PIECE_ROTATIONS.O) {
      expect(keyOf(cells)).toBe(first)
    }
  })

  it('非 O 方块的四个旋转态不全相同', () => {
    for (const type of ALL_TYPES.filter((t) => t !== 'O')) {
      const keys = new Set(PIECE_ROTATIONS[type].map(keyOf))
      expect(keys.size).toBeGreaterThan(1)
    }
  })
})

describe('pieceCells', () => {
  it('按棋盘位置平移为绝对坐标', () => {
    const cells = pieceCells({ type: 'T', rotation: 0, x: 3, y: 10 })
    expect(keyOf(cells)).toBe(keyOf([[3, 11], [4, 11], [5, 11], [4, 10]]))
  })

  it('y 为负时产出负行坐标（出生悬在场外）', () => {
    const cells = pieceCells({ type: 'T', rotation: 0, x: 3, y: -1 })
    expect(cells.some(([, y]) => y < 0)).toBe(true)
    expect(cells.some(([, y]) => y >= 0)).toBe(true)
  })
})
