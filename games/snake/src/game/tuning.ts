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
  /** 奖励食物得分（只加分不变长，Snake II 风险回报） */
  bonusScore: 50,
  /** 奖励食物存活时长（ms） */
  bonusLifetimeMs: 5000,
  /** 每吃多少个普通食物出现一次奖励食物 */
  bonusEvery: 5,
  /** 方向队列容量：缓存最近 2 次按键，防快速转向丢输入 */
  dirQueueLength: 2,
} as const
