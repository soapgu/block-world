/** 网格坐标（格子级，非像素） */
export interface Point {
  x: number
  y: number
}

/** 移动方向 */
export type Dir = 'up' | 'down' | 'left' | 'right'

/** 引擎状态机；paused 类型先行定义，按键接线在 v2 */
export type SnakeState = 'ready' | 'playing' | 'paused' | 'over'

/** React 外壳展示的统计数据 */
export interface Stats {
  score: number
  length: number
}
