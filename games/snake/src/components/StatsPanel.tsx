import type { Stats } from '../game/types'

export function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <aside className="panel">
      <h2 className="panel-label">SCORE</h2>
      <p className="panel-value">{stats.score}</p>
      <h2 className="panel-label">LENGTH</h2>
      <p className="panel-value">{stats.length}</p>
      <div className="help">
        ↑↓←→ / WASD 转向
        <br />
        回车 开始 / 重开
        <br />
        撞墙或撞己结束
      </div>
    </aside>
  )
}
