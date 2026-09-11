import type { Stats } from '../game/types'

export function StatsPanel({
  stats,
  best,
  isNewBest,
}: {
  stats: Stats
  best: number
  isNewBest: boolean
}) {
  return (
    <aside className="panel">
      <h2 className="panel-label">SCORE</h2>
      <p className="panel-value">{stats.score}</p>
      <h2 className="panel-label">BEST</h2>
      <p className={isNewBest ? 'panel-value newbest' : 'panel-value'}>
        {best}
      </p>
      <h2 className="panel-label">LENGTH</h2>
      <p className="panel-value">{stats.length}</p>
      <div className="help">
        ↑↓←→ / WASD 转向
        <br />
        P 暂停 / 继续
        <br />
        回车 开始 / 重开
        <br />
        撞墙或撞己结束
      </div>
    </aside>
  )
}
