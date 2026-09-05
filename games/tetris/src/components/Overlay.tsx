import type { EngineState } from '../game/types'

export function Overlay({
  state,
  score,
  best,
  isNewBest,
}: {
  state: EngineState
  score: number
  best: number
  isNewBest: boolean
}) {
  if (state === 'playing') return null

  let title: string
  let detail: JSX.Element
  if (state === 'ready') {
    title = '俄罗斯方块'
    detail = <p className="overlay-detail">按 回车 开始</p>
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
        <p className="overlay-detail">按 回车 再来一局</p>
      </>
    )
  }

  return (
    <div className="overlay">
      <h1 className="overlay-title">{title}</h1>
      {detail}
    </div>
  )
}
