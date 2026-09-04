import { describe, expect, it } from 'vitest'
import {
  PIECE_BOX_SIZE,
  PIECE_ROTATIONS,
  pieceCells,
  rotationCandidates,
} from '../src/game/pieces'
import type { Piece, PieceType } from '../src/game/types'

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

describe('rotationCandidates（SRS 踢墙）', () => {
  it('首个候选为原位旋转（零偏移）', () => {
    const piece: Piece = { type: 'T', rotation: 0, x: 3, y: 5 }
    const [first] = rotationCandidates(piece, 1)
    expect(first.rotation).toBe(1)
    expect(first.x).toBe(3)
    expect(first.y).toBe(5)
  })

  it('JLSTZ 顺时针 0>1 的第二个偏移为左移一格（y 轴已翻转）', () => {
    const piece: Piece = { type: 'T', rotation: 0, x: 3, y: 5 }
    const second = rotationCandidates(piece, 1)[1]
    // SRS 偏移 (-1, 0)：x-1，y 不变
    expect(second.x).toBe(2)
    expect(second.y).toBe(5)
  })

  it('JLSTZ 顺时针 0>1 的第三个偏移为左移一格且上移一格', () => {
    const piece: Piece = { type: 'T', rotation: 0, x: 3, y: 5 }
    const third = rotationCandidates(piece, 1)[2]
    // SRS 偏移 (-1, +1)：屏幕坐标 y 向下，应减一
    expect(third.x).toBe(2)
    expect(third.y).toBe(4)
  })

  it('I 块使用专用表：0>1 第二个偏移为 (-2, 0)', () => {
    const piece: Piece = { type: 'I', rotation: 0, x: 3, y: 5 }
    const second = rotationCandidates(piece, 1)[1]
    expect(second.x).toBe(1)
    expect(second.y).toBe(5)
  })

  it('O 块只给一个候选且位置不变', () => {
    const piece: Piece = { type: 'O', rotation: 0, x: 4, y: 0 }
    const candidates = rotationCandidates(piece, 1)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].x).toBe(4)
    expect(candidates[0].y).toBe(0)
    expect(candidates[0].rotation).toBe(1)
  })

  it('逆时针 0>3 使用对应表：第二个偏移为 (+1, 0)', () => {
    const piece: Piece = { type: 'T', rotation: 0, x: 3, y: 5 }
    const second = rotationCandidates(piece, -1)[1]
    expect(second.x).toBe(4)
    expect(second.y).toBe(5)
  })

  it('除 O 外每种方块给 5 个候选，且旋转态编号正确', () => {
    for (const type of ALL_TYPES.filter((t) => t !== 'O')) {
      const candidates = rotationCandidates(
        { type, rotation: 2, x: 3, y: 5 },
        1,
      )
      expect(candidates).toHaveLength(5)
      for (const c of candidates) expect(c.rotation).toBe(3)
    }
  })
})
