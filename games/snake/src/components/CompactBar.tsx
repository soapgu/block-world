import type { Stats } from '../game/types'

/** 窄屏竖屏布局的精简信息条：SCORE | BEST | LEN 单行排布 */
export function CompactBar({
  stats,
  best,
}: {
  stats: Stats
  best: number
}) {
  return (
    <div className="compact-bar" role="status">
      <div className="cb-group">
        <span className="cb-label">SCORE</span>
        <span className="cb-stat">{stats.score}</span>
      </div>
      <div className="cb-group">
        <span className="cb-label">BEST</span>
        <span className="cb-stat">{best}</span>
      </div>
      <div className="cb-group">
        <span className="cb-label">LEN</span>
        <span className="cb-stat">{stats.length}</span>
      </div>
    </div>
  )
}
