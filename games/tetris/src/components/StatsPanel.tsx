import { PieceIcon } from './PieceIcon'
import type { PieceType, Stats } from '../game/types'

export function StatsPanel({
  stats,
  hold,
  next,
  best,
  isNewBest,
}: {
  stats: Stats
  hold: PieceType | null
  next: readonly PieceType[]
  best: number
  isNewBest: boolean
}) {
  return (
    <aside className="panel">
      <h2 className="panel-label">HOLD</h2>
      <div className="icon-slot">
        {hold ? <PieceIcon type={hold} /> : <span className="empty-slot">—</span>}
      </div>
      <h2 className="panel-label">NEXT</h2>
      <div className="next-list">
        {next.map((type, i) => (
          <div className="icon-slot" key={i}>
            <PieceIcon type={type} />
          </div>
        ))}
      </div>
      <h2 className="panel-label">SCORE</h2>
      <p className="panel-value">{stats.score}</p>
      <h2 className="panel-label">BEST</h2>
      <p className={isNewBest ? 'panel-value newbest' : 'panel-value'}>
        {best}
      </p>
      <h2 className="panel-label">LEVEL</h2>
      <p className="panel-value">{stats.level}</p>
      <h2 className="panel-label">LINES</h2>
      <p className="panel-value">{stats.lines}</p>
      <div className="help">
        ← → 移动 · ↑/X 旋转 · Z 反转
        <br />
        ↓ 软降 · 空格 硬降
        <br />
        Shift 暂存 · P 暂停
        <br />
        M 静音 · B 音乐
      </div>
    </aside>
  )
}
