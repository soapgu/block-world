import { CELL, GAP } from './style'

// T 形四格：(列, 行)，以 4x2 小网格摆放
const T_CELLS: Array<[number, number]> = [
  [0, 1],
  [1, 1],
  [2, 1],
  [1, 0],
]

const COLS = 4
const ROWS = 2

function TPiece() {
  return (
    <svg
      width={COLS * CELL}
      height={ROWS * CELL + GAP}
      viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL + GAP}`}
      aria-label="T 形方块"
    >
      {T_CELLS.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={c * CELL + GAP}
          y={r * CELL + GAP}
          width={CELL - GAP}
          height={CELL - GAP}
          fill="#39ff6e"
          stroke="#0a3a0a"
          strokeWidth={GAP}
        />
      ))}
    </svg>
  )
}

export default function App() {
  return (
    <div className="page">
      <TPiece />
      <h1 className="title">俄罗斯方块</h1>
      <p className="status">V1 · 建设中</p>
      <p className="hint">工程已就绪，游戏玩法开发中</p>
      <a className="back" href="../../index.html">
        ← 返回方块世界
      </a>
    </div>
  )
}
