import type { SnakeState } from '../game/types'

export function Overlay({
  state,
  score,
  onTapStart,
}: {
  state: SnakeState
  score: number
  /** 点按遮罩：移动端等效回车（开始/重开），v3 触屏接线 */
  onTapStart?: () => void
}) {
  if (state === 'playing') return null

  let title: string
  let detail: JSX.Element
  if (state === 'ready') {
    title = '贪吃蛇'
    detail = <p className="overlay-detail">按 回车 / 点按 开始</p>
  } else {
    title = 'GAME OVER'
    detail = (
      <>
        <p className="overlay-detail">得分 {score}</p>
        <p className="overlay-detail">按 回车 / 点按 再来一局</p>
      </>
    )
  }

  return (
    <div
      className="overlay"
      role="button"
      aria-label="开始或重开"
      onClick={onTapStart}
    >
      <h1 className="overlay-title">{title}</h1>
      {detail}
    </div>
  )
}
