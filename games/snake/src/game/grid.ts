import type { Dir } from './types'

/** 网格列数（调网格尺寸改这里，tuning 不重复定义） */
export const GRID_WIDTH = 20
/** 网格行数 */
export const GRID_HEIGHT = 20

/** 各方向的格位移 [dx, dy] */
export const DIR_VECTORS: Record<Dir, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export function isOppositeDir(a: Dir, b: Dir): boolean {
  return OPPOSITE[a] === b
}

/** 点是否在网格界内（撞墙判定） */
export function insideGrid(p: { x: number; y: number }): boolean {
  return p.x >= 0 && p.x < GRID_WIDTH && p.y >= 0 && p.y < GRID_HEIGHT
}
