const CELL = 16
const GAP = 2

// 蛇形像素图案：一条向右爬行的 S 形蛇（头亮、身暗、食物闪烁点）
// (列, 行) 网格：12×7
const SNAKE_HEAD: Array<[number, number]> = [[10, 2]]
const SNAKE_BODY: Array<[number, number]> = [
  [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
  [3, 3], [3, 4],
  [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
]
const FOOD: Array<[number, number]> = [[8, 4]]

const COLS = 12
const ROWS = 7

function SnakeArt() {
  return (
    <svg
      width={COLS * CELL}
      height={ROWS * CELL + GAP}
      viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL + GAP}`}
      aria-label="像素蛇"
    >
      {SNAKE_BODY.map(([c, r]) => (
        <rect
          key={`b-${c}-${r}`}
          x={c * CELL + GAP}
          y={r * CELL + GAP}
          width={CELL - GAP}
          height={CELL - GAP}
          fill="#2f9e44"
        />
      ))}
      {SNAKE_HEAD.map(([c, r]) => (
        <rect
          key="head"
          x={c * CELL + GAP}
          y={r * CELL + GAP}
          width={CELL - GAP}
          height={CELL - GAP}
          fill="#39ff6e"
          stroke="#0a3a0a"
          strokeWidth={GAP}
        />
      ))}
      {FOOD.map(([c, r]) => (
        <rect
          key="food"
          x={c * CELL + GAP}
          y={r * CELL + GAP}
          width={CELL - GAP}
          height={CELL - GAP}
          fill="#9fff9f"
          className="food-blink"
        />
      ))}
    </svg>
  )
}

export default function App() {
  return (
    <div className="page">
      <SnakeArt />
      <h1 className="title">贪吃蛇</h1>
      <p className="status">V1 · 建设中</p>
      <p className="hint">工程已就绪，游戏玩法开发中</p>
      <a className="back" href="../../index.html">
        ← 返回方块世界
      </a>
    </div>
  )
}
