import type { SnakeState } from '../game/types'

export function Overlay({
  state,
  score,
  best,
  isNewBest,
  onTapStart,
}: {
  state: SnakeState
  score: number
  best: number
  isNewBest: boolean
  /** 点按遮罩：移动端等效回车（开始/重开），v3 触屏接线 */
  onTapStart?: () => void
}) {
  if (state === 'playing') return null

  let title: string
  let detail: JSX.Element
  if (state === 'ready') {
    title = '贪吃蛇'
    detail = <p className="overlay-detail">按 回车 / 点按 开始</p>
  } else if (state === 'paused') {
    title = '暂停'
    detail = <p className="overlay-detail">按 P 继续</p>
  } else {
    title = 'GAME OVER'
    detail = (
      <>
        <p className="overlay-detail">得分 {score}</p>
        {isNewBest && score > 0 ? (
          <p className="overlay-newbest">★ 新纪录 ★</p>
        ) : (
          <p className="overlay-detail">最高分 {best}</p>
        )}
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
