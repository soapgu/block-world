/** 手感参数集中于此，试玩后在此调参 */
export const TUNING = {
  /** 1 级的重力间隔（ms） */
  baseDropInterval: 800,
  /** 每升 1 级重力间隔的衰减系数 */
  dropIntervalDecay: 0.85,
  /** 重力间隔下限（ms），避免高级别不可玩 */
  minDropInterval: 60,
  /** 按住 ↓ 软降时的间隔（ms） */
  softDropInterval: 50,
  /** 每消多少行升 1 级 */
  linesPerLevel: 10,
  /** 一次消 1/2/3/4 行的基础分（× 等级） */
  lineScores: [0, 100, 300, 500, 800],
  /** DAS：左右长按的首次自动重复延迟（ms） */
  dasInitialDelay: 170,
  /** DAS：自动重复间隔（ms） */
  dasRepeat: 50,
  /** 锁定延迟：触底后允许继续调整的宽限时间（ms） */
  lockDelay: 500,
  /** 锁定延迟期间移动/旋转最多可刷新计时的次数 */
  lockResets: 15,
  /** 消行动画时长（ms） */
  clearAnimMs: 300,
  /** 四消（Tetris）动画时长（ms） */
  tetrisAnimMs: 450,
  /** 软降每下落一格的加分 */
  softDropBonus: 1,
  /** 硬降每下落一格的加分 */
  hardDropBonus: 2,
  /** T-Spin 消 1/2/3 行的基础分（× 等级） */
  tspinScores: [0, 800, 1200, 1600],
} as const

export function dropIntervalForLevel(level: number): number {
  const interval =
    TUNING.baseDropInterval *
    TUNING.dropIntervalDecay ** (Math.max(1, level) - 1)
  return Math.max(TUNING.minDropInterval, interval)
}
