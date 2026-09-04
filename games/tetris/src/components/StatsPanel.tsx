import type { Stats } from '../game/types'

export function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <aside className="panel">
      <h2 className="panel-label">SCORE</h2>
      <p className="panel-value">{stats.score}</p>
      <h2 className="panel-label">LEVEL</h2>
      <p className="panel-value">{stats.level}</p>
      <h2 className="panel-label">LINES</h2>
      <p className="panel-value">{stats.lines}</p>
      <div className="help">
        ← → 移动
        <br />
        ↑ 旋转 · ↓ 软降
        <br />
        空格 硬降
        <br />
        P 暂停 · 回车 开始
      </div>
    </aside>
  )
}
