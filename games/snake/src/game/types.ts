/** 网格坐标（格子级，非像素） */
export interface Point {
  x: number
  y: number
}

/** 移动方向 */
export type Dir = 'up' | 'down' | 'left' | 'right'

/** 限时奖励食物：位置 + 剩余存活毫秒 */
export interface BonusFood {
  point: Point
  timer: number
}

/** 引擎状态机；dying = 死亡逐节熄灭动画中，结束后转 over */
export type SnakeState = 'ready' | 'playing' | 'paused' | 'dying' | 'over'

/** React 外壳展示的统计数据 */
export interface Stats {
  score: number
  length: number
}
