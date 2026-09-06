import { PieceIcon } from './PieceIcon'
import type { PieceType, Stats } from '../game/types'

/** 窄屏竖屏布局的精简信息条：HOLD | NEXT×1 | 分数/等级/行数 单行排布 */
export function CompactBar({
  stats,
  hold,
  next,
}: {
  stats: Stats
  hold: PieceType | null
  next: readonly PieceType[]
}) {
  return (
    <div className="compact-bar" role="status">
      <div className="cb-group">
        <span className="cb-label">HOLD</span>
        <div className="cb-icon">{hold ? <PieceIcon type={hold} /> : <span className="cb-empty">—</span>}</div>
      </div>
      <div className="cb-group">
        <span className="cb-label">NEXT</span>
        <div className="cb-icon">{next[0] !== undefined && <PieceIcon type={next[0]} />}</div>
      </div>
      <div className="cb-stats">
        <span className="cb-stat">{stats.score}</span>
        <span className="cb-stat cb-dim">Lv{stats.level}</span>
        <span className="cb-stat cb-dim">{stats.lines}行</span>
      </div>
    </div>
  )
}
