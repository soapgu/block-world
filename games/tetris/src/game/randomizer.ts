import type { PieceType } from './types'

export interface Randomizer {
  next(): PieceType
}

const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

/** v1 纯随机发牌（等概率 7 选 1）；v2 将替换为 7-bag，接口保持不变 */
export function createRandomizer(): Randomizer {
  return {
    next: () => TYPES[Math.floor(Math.random() * TYPES.length)],
  }
}
