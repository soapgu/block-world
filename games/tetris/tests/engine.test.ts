import { describe, expect, it } from 'vitest'
import { Engine } from '../src/game/engine'
import type { Randomizer } from '../src/game/randomizer'
import type { PieceType } from '../src/game/types'

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
