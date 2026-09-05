import { describe, expect, it } from 'vitest'
import { Engine } from '../src/game/engine'
import type { GameEvent } from '../src/game/engine'
import type { Randomizer } from '../src/game/randomizer'
import type { Cell, PieceType } from '../src/game/types'

/** 固定序列发牌器：按给定顺序循环发牌，绕过 7-bag 以便断言 */
function fixedRandomizer(sequence: PieceType[]): Randomizer {
  let i = 0
  return { next: () => sequence[i++ % sequence.length] }
}

const SEQ: PieceType[] = ['T', 'I', 'O', 'J', 'L', 'S', 'Z', 'I', 'O', 'J', 'L', 'S', 'Z', 'I']

describe('发牌队列与 Next 预览', () => {
  it('开局后 Next 预览为队列接下来的 3 块', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(SEQ) })
    engine.start()
    // T 已出场，预览应为 I、O、J
    expect(engine.getUiSnapshot().next).toEqual(['I', 'O', 'J'])
  })

  it('方块落定后队列前移，预览随之更新', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(SEQ) })
    engine.start()
    engine.hardDrop() // T 落定，I 出场
    expect(engine.getUiSnapshot().next).toEqual(['O', 'J', 'L'])
  })
})

describe('Hold 暂存', () => {
  it('首次 Hold 收起当前块并出场下一块', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(SEQ) })
    engine.start()
    engine.holdPiece()
    expect(engine.getUiSnapshot().hold).toBe('T')
    expect(engine.getUiSnapshot().next).toEqual(['O', 'J', 'L']) // I 已出场
  })

  it('同一块落定前第二次 Hold 无效', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(SEQ) })
    engine.start()
    engine.holdPiece() // T 入槽，I 出场
    engine.holdPiece() // holdUsed，应无效果
    engine.hardDrop() // I 落定（槽里仍是 T）
    expect(engine.getUiSnapshot().hold).toBe('T')
    expect(engine.getUiSnapshot().next).toEqual(['J', 'L', 'S']) // O 已出场
  })

  it('锁定后 Hold 次数复位，且换出槽中方块', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(SEQ) })
    engine.start()
    engine.holdPiece() // T 入槽，I 出场
    engine.hardDrop() // I 落定，O 出场，holdUsed 复位
    engine.holdPiece() // O 入槽，T 出场
    expect(engine.getUiSnapshot().hold).toBe('O')
  })
})

describe('软降/硬降计分', () => {
  it('软降每下落一格 +1', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['O']) })
    engine.start()
    engine.setSoftDrop(true)
    engine.update(50) // 软降间隔 50ms，恰好一步
    expect(engine.score).toBe(1)
  })

  it('硬降每下落一格 +2（O 从顶落底 18 格 = 36 分）', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['O']) })
    engine.start()
    engine.hardDrop()
    expect(engine.score).toBe(36)
  })
})

describe('锁定延迟', () => {
  it('触底后不立即锁定，延迟期满才锁', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['O']) })
    engine.start()
    engine.setSoftDrop(true)
    engine.update(1000) // O 落到底（y=18）
    engine.setSoftDrop(false)
    expect(engine.piece!.y).toBe(18)

    engine.update(400) // 400 < 500，仍在宽限中
    expect(engine.piece!.y).toBe(18)

    engine.update(200) // 累计 600 ≥ 500，锁定并出新块
    expect(engine.piece!.y).toBe(0)
  })

  it('触底期间的移动会刷新宽限计时', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['O']) })
    engine.start()
    engine.setSoftDrop(true)
    engine.update(1000)
    engine.setSoftDrop(false)

    engine.update(400) // 计时 400
    engine.moveX(1) // 成功移动 → 计时清零（第 1 次刷新）
    engine.update(400) // 400 < 500，仍未锁
    expect(engine.piece!.y).toBe(18)

    engine.update(200) // 600 ≥ 500，锁定
    expect(engine.piece!.y).toBe(0)
  })
})

describe('消行动画', () => {
  it('锁定成整行后进入动画，动画结束后塌落并发新块', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['O']) })
    engine.start()
    // 底行铺 8 格、留 (8,19)(9,19) 两个空位，O 移到 x=8 后落底恰好补满
    const bottom: Cell[] = [
      ...Array(8).fill('J'),
      null,
      null,
    ]
    engine.board[19] = bottom
    for (let i = 0; i < 4; i++) engine.moveX(1) // O：x 4→8
    engine.hardDrop()

    // 硬降 36 分 + 单行 100 分
    expect(engine.score).toBe(136)
    expect(engine.lines).toBe(1)
    expect(engine.clearingRows).toEqual([19])
    expect(engine.piece).toBeNull()

    engine.update(299) // 动画未结束
    expect(engine.clearingRows).toEqual([19])
    engine.update(1) // 300ms 到期
    expect(engine.clearingRows).toEqual([])
    // 满行（8 个 J）已消除，O 的上半格沉到底行
    expect(engine.board[19][0]).toBeNull()
    expect(engine.board[19][8]).toBe('O')
    expect(engine.piece).not.toBeNull()
  })
})

describe('游戏事件', () => {
  function collect(engine: Engine): GameEvent[] {
    const events: GameEvent[] = []
    engine.onEvent = (e) => events.push(e)
    return events
  }

  it('移动与旋转成功时派发对应事件', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(SEQ) })
    const events = collect(engine)
    engine.start()
    engine.moveX(1)
    engine.rotate(1)
    expect(events).toContainEqual({ type: 'move' })
    expect(events).toContainEqual({ type: 'rotate' })
  })

  it('硬降依次派发 hardDrop 与 lock', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['O']) })
    const events = collect(engine)
    engine.start()
    engine.hardDrop()
    expect(events).toEqual([{ type: 'hardDrop' }, { type: 'lock' }])
  })

  it('消行派发带行数的 clear 事件', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['O']) })
    const events = collect(engine)
    engine.start()
    engine.board[19] = [...Array(8).fill('J'), null, null] as Cell[]
    for (let i = 0; i < 4; i++) engine.moveX(1)
    engine.hardDrop()
    expect(events).toContainEqual({ type: 'lock' })
    expect(events).toContainEqual({ type: 'clear', lines: 1 })
  })

  it('四消派发 tetris 而非 clear', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['I']) })
    const events = collect(engine)
    engine.start()
    // 右侧留一条一格宽的井：16~19 行只空 (9,y)
    for (let y = 16; y < 20; y++) {
      engine.board[y] = [...Array(9).fill('J'), null] as Cell[]
    }
    engine.rotate(1) // I 竖置（cells 落在包围盒 col 2）
    for (let i = 0; i < 4; i++) engine.moveX(1) // x 3→7，竖条对准 col 9
    engine.hardDrop()
    expect(events).toContainEqual({ type: 'tetris' })
    expect(events).not.toContainEqual({ type: 'clear', lines: 4 })
    expect(engine.lines).toBe(4)
  })

  it('堆到出生点派发 gameOver', () => {
    const engine = new Engine({ randomizer: fixedRandomizer(['T', 'I']) })
    const events = collect(engine)
    engine.start()
    // 填满棋盘但每行留 col 9 空位（不会形成满行）
    for (let y = 0; y < 20; y++) {
      engine.board[y] = [...Array(9).fill('J'), null] as Cell[]
    }
    engine.hardDrop() // T 原地锁定；下一块 I 出生即碰撞
    expect(engine.state).toBe('over')
    expect(events).toContainEqual({ type: 'gameOver' })
  })
})
