import { describe, expect, it } from 'vitest'
import {
  clearLines,
  collides,
  createBoard,
  ghostDrop,
  isTSpin,
  lockPiece,
} from '../src/game/board'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../src/game/types'
import type { Board, Cell, Piece, PieceType } from '../src/game/types'

/** 用字符串画板：'.' 为空，字母为方块类型；缺省补空行 */
function boardFrom(rows: string[]): Board {
  const parse = (row: string): Cell[] =>
    row
      .padEnd(BOARD_WIDTH, '.')
      .slice(0, BOARD_WIDTH)
      .split('')
      .map<Cell>((ch) => (ch === '.' ? null : (ch as PieceType)))
  return Array.from({ length: BOARD_HEIGHT }, (_, y) =>
    parse(rows[y] ?? ''),
  )
}

describe('collides', () => {
  it('空棋盘上场内坐标不冲突', () => {
    expect(collides(createBoard(), [[0, 0], [9, 19]])).toBe(false)
  })

  it('越出左、右、底边界为冲突', () => {
    const board = createBoard()
    expect(collides(board, [[-1, 5]])).toBe(true)
    expect(collides(board, [[BOARD_WIDTH, 5]])).toBe(true)
    expect(collides(board, [[0, BOARD_HEIGHT]])).toBe(true)
  })

  it('行号为负（场外上方）只查横向，不视为冲突', () => {
    const board = createBoard()
    expect(collides(board, [[4, -1], [5, -2]])).toBe(false)
    expect(collides(board, [[-1, -1]])).toBe(true)
  })

  it('与已占用格子重叠为冲突', () => {
    const board = boardFrom(['..T.......', '..........'])
    expect(collides(board, [[2, 0]])).toBe(true)
    expect(collides(board, [[3, 0]])).toBe(false)
  })
})

describe('lockPiece', () => {
  it('将方块四格写入棋盘对应位置', () => {
    const board = createBoard()
    // T 形：包围盒 (0,0) 起，cells (0,1)(1,1)(2,1)(1,0)
    const { board: locked, toppedOut } = lockPiece(board, {
      type: 'T',
      rotation: 0,
      x: 3,
      y: 5,
    })
    expect(toppedOut).toBe(false)
    expect(locked[5][4]).toBe('T')
    expect(locked[6][3]).toBe('T')
    expect(locked[6][4]).toBe('T')
    expect(locked[6][5]).toBe('T')
    expect(locked[6][6]).toBeNull()
  })

  it('不修改原棋盘', () => {
    const board = createBoard()
    lockPiece(board, { type: 'O', rotation: 0, x: 4, y: 0 })
    expect(board[0][4]).toBeNull()
  })

  it('格子悬在顶边之上时 toppedOut 为 true', () => {
    const board = boardFrom(['..........', '..........'])
    // I 形旋转态 0 的 cells 在包围盒第 1 行，y=-1 使其落在场外
    const { toppedOut } = lockPiece(board, {
      type: 'I',
      rotation: 0,
      x: 3,
      y: -2,
    })
    expect(toppedOut).toBe(true)
  })
})

describe('ghostDrop', () => {
  it('空棋盘上 O 块可直落到底（18 格）', () => {
    const board = createBoard()
    const piece: Piece = { type: 'O', rotation: 0, x: 4, y: 0 }
    expect(ghostDrop(board, piece)).toBe(18)
  })

  it('被堆叠挡住时落到堆顶上方', () => {
    const board = boardFrom([
      ...Array(19).fill('..........'),
      'OO........',
    ])
    const piece: Piece = { type: 'O', rotation: 0, x: 0, y: 0 }
    // 底行 (0,19)(1,19) 已占，O 最终停在 rows 17-18
    expect(ghostDrop(board, piece)).toBe(17)
  })

  it('贴住堆顶时为 0', () => {
    const board = boardFrom([
      ...Array(19).fill('..........'),
      'OO........',
    ])
    const piece: Piece = { type: 'O', rotation: 0, x: 0, y: 17 }
    expect(ghostDrop(board, piece)).toBe(0)
  })
})

describe('clearLines', () => {
  it('没有满行时棋盘不变、消除 0 行', () => {
    const board = boardFrom(['..T.......', '..........'])
    const result = clearLines(board)
    expect(result.clearedRows).toEqual([])
    expect(result.board).toBe(board)
  })

  it('消除单个满行，上方内容下沉', () => {
    const board = boardFrom([
      '..T.......',
      'JJJJJJJJJJ',
      '..........',
    ])
    const { board: after, clearedRows } = clearLines(board)
    expect(clearedRows).toEqual([1])
    // 原第 0 行的 T 下沉一行到第 1 行，顶部补入空行
    expect(after[0].every((c) => c === null)).toBe(true)
    expect(after[1][2]).toBe('T')
  })

  it('消除多个不连续的满行', () => {
    const board = boardFrom([
      'JJJJJJJJJJ',
      '..T.......',
      'LLLLLLLLLL',
      '..Z.......',
    ])
    const { board: after, clearedRows } = clearLines(board)
    expect(clearedRows).toEqual([0, 2])
    // 消去第 0、2 行后，T 与 Z 各下沉两行
    expect(after[2][2]).toBe('T')
    expect(after[3][2]).toBe('Z')
    expect(after[0].every((c) => c === null)).toBe(true)
    expect(after[1].every((c) => c === null)).toBe(true)
  })

  it('一次消四行（Tetris）', () => {
    const board = boardFrom([
      '..T.......',
      'OOOOOOOOOO',
      'IIIIIIIIII',
      'TTTTTTTTTT',
      'SSSSSSSSSS',
    ])
    const { clearedRows } = clearLines(board)
    expect(clearedRows).toEqual([1, 2, 3, 4])
  })
})

describe('isTSpin（三角判定）', () => {
  const tPiece: Piece = { type: 'T', rotation: 1, x: 0, y: 10 }

  it('T 块 + 最后操作为旋转 + 四角占三（含堆叠）时成立', () => {
    // T 包围盒四角：(0,10)(2,10)(0,12)(2,12)
    const board = boardFrom([
      ...Array(10).fill('..........'),
      'X.X.......',
      '..........',
      'X.........',
    ])
    expect(isTSpin(board, tPiece, true)).toBe(true)
  })

  it('最后操作不是旋转时不成立', () => {
    const board = boardFrom([
      ...Array(10).fill('..........'),
      'X.X.......',
      '..........',
      'X.........',
    ])
    expect(isTSpin(board, tPiece, false)).toBe(false)
  })

  it('非 T 块不成立', () => {
    const board = boardFrom([
      ...Array(10).fill('..........'),
      'X.X.......',
      '..........',
      'X.........',
    ])
    expect(
      isTSpin(board, { ...tPiece, type: 'J' }, true),
    ).toBe(false)
  })

  it('四角只占两个时不成立', () => {
    const board = boardFrom([
      ...Array(10).fill('..........'),
      'X.X.......',
    ])
    expect(isTSpin(board, tPiece, true)).toBe(false)
  })

  it('墙与底部也算占用', () => {
    // T 块贴左墙（x=-1）：四角中两角越出左墙，加上 (1,10) 一个堆叠格共 3 个
    const board = boardFrom([
      ...Array(10).fill('..........'),
      '.X........',
    ])
    expect(
      isTSpin(board, { type: 'T', rotation: 1, x: -1, y: 10 }, true),
    ).toBe(true)
  })
})
