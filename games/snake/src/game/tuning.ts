/**
 * 手感调参集中地：改初速/加速曲线/初始长度只动这里。
 * 网格尺寸在 grid.ts（几何常量单独一处定义）。
 */
export const TUNING = {
  /** 初始蛇长 */
  initialLength: 3,
  /** 初始步进间隔（ms） */
  initialInterval: 200,
  /** 每吃 1 个食物间隔缩短（ms） */
  intervalDecay: 4,
  /** 间隔下限（ms）：满 33 食后到底 */
  minInterval: 70,
  /** 每个食物得分 */
  foodScore: 10,
  /** 方向队列容量：缓存最近 2 次按键，防快速转向丢输入 */
  dirQueueLength: 2,
} as const
