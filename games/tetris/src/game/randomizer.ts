import type { PieceType } from './types'

export interface Randomizer {
  next(): PieceType
}

const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

function shuffled<T>(items: readonly T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 7-bag 随机发牌：7 种方块各一块装袋洗乱，发完一袋再换下一袋，
 * 保证任意时刻最多等 12 块就能等到任意一种方块。
 */
export function createRandomizer(): Randomizer {
  let bag: PieceType[] = []
  return {
    next: () => {
      if (bag.length === 0) bag = shuffled(TYPES)
      return bag.pop()!
    },
  }
}
