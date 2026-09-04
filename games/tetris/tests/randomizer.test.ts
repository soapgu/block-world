import { describe, expect, it } from 'vitest'
import { createRandomizer } from '../src/game/randomizer'

describe('7-bag 随机发牌', () => {
  it('任意连续 7 次恰好集齐 7 种方块', () => {
    const randomizer = createRandomizer()
    const drawn: string[] = []
    for (let i = 0; i < 70; i++) drawn.push(randomizer.next())
    for (let i = 0; i + 7 <= drawn.length; i += 7) {
      expect(new Set(drawn.slice(i, i + 7)).size).toBe(7)
    }
  })

  it('多袋之间顺序洗乱（相邻袋几乎不可能全同）', () => {
    const randomizer = createRandomizer()
    const drawn: string[] = []
    for (let i = 0; i < 70; i++) drawn.push(randomizer.next())
    const bags = new Set<string>()
    for (let i = 0; i < drawn.length; i += 7) {
      bags.add(drawn.slice(i, i + 7).join(''))
    }
    expect(bags.size).toBeGreaterThan(1)
  })
})
