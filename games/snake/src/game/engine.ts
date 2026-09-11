import { spawnBonusFood, spawnFood } from './food'
import type { Rng } from './food'
import { insideGrid, isOppositeDir } from './grid'
import { advance, blocksCell, createSnake, nextHead } from './snake'
import type { SnakeBody } from './snake'
import { TUNING } from './tuning'
import type { BonusFood, Dir, Point, SnakeState, Stats } from './types'

/** React 外壳需要的低频 UI 数据（每帧浅比较后同步） */
export interface UiSnapshot extends Stats {
  state: SnakeState
}

/** 引擎在关键节点派发的游戏事件（音效/最高分从这里订阅，不参与游戏逻辑） */
export type GameEvent =
  | { type: 'eat' }
  | { type: 'eatBonus' }
  | { type: 'bonusExpire' }
  | { type: 'gameOver' }

export interface EngineOptions {
  /** 注入随机源（测试用固定序列） */
  rng?: Rng
}

/**
 * 游戏引擎：持有全部游戏数据，只暴露命令与 update(dt)。
 * 不碰 DOM / React，可独立单测。
 */
export class Engine {
  state: SnakeState = 'ready'
  snake: SnakeBody = createSnake()
  dir: Dir = 'right'
  food: Point | null = null
  /** 限时奖励食物（与普通食物并存） */
  bonus: BonusFood | null = null
  score = 0
  eaten = 0

  /** 方向队列：缓存最近按键，每步只消费 1 个 */
  private dirQueue: Dir[] = []
  private stepTimer = 0
  /** 死亡熄灭动画已进行的时间（ms） */
  private dieTimer = 0
  /** 事件监听器列表 */
  private listeners: Array<(event: GameEvent) => void> = []
  private readonly rng: Rng

  constructor(options: EngineOptions = {}) {
    this.rng = options.rng ?? Math.random
    this.food = spawnFood(this.snake, this.rng)
  }

  /** 订阅游戏事件，返回退订函数 */
  subscribe(listener: (event: GameEvent) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  get length(): number {
    return this.snake.length
  }

  getStats(): Stats {
    return { score: this.score, length: this.snake.length }
  }

  getUiSnapshot(): UiSnapshot {
    return {
      score: this.score,
      length: this.snake.length,
      state: this.state,
    }
  }

  /** 当前步进间隔：随进食数线性加速，钳到下限 */
  stepInterval(): number {
    return Math.max(
      TUNING.minInterval,
      TUNING.initialInterval - this.eaten * TUNING.intervalDecay,
    )
  }

  start(): void {
    this.snake = createSnake()
    this.dir = 'right'
    this.dirQueue = []
    this.score = 0
    this.eaten = 0
    this.stepTimer = 0
    this.dieTimer = 0
    this.food = spawnFood(this.snake, this.rng)
    this.bonus = null
    this.state = 'playing'
  }

  togglePause(): void {
    if (this.state === 'playing') this.state = 'paused'
    else if (this.state === 'paused') this.state = 'playing'
  }

  /** 死亡熄灭动画进度 0~1（非 dying 状态为 0） */
  dyingProgress(): number {
    if (this.state !== 'dying') return 0
    return Math.min(1, this.dieTimer / TUNING.dyingDurationMs)
  }

  /**
   * 转向入队。与队尾（队列空则当前方向）相同或相反（180° 回头）的输入丢弃；
   * 队列满（长 2）不再入。真正生效要等下一步步进消费。
   */
  turn(dir: Dir): void {
    if (this.state !== 'playing') return
    const last = this.dirQueue.length > 0
      ? this.dirQueue[this.dirQueue.length - 1]
      : this.dir
    if (dir === last || isOppositeDir(dir, last)) return
    if (this.dirQueue.length >= TUNING.dirQueueLength) return
    this.dirQueue.push(dir)
  }

  /** 每帧推进（dt 毫秒）。playing 推进游戏，dying 推进熄灭动画。 */
  update(dt: number): void {
    if (this.state === 'dying') {
      this.dieTimer += dt
      if (this.dieTimer >= TUNING.dyingDurationMs) this.state = 'over'
      return
    }
    if (this.state !== 'playing') return
    this.tickBonus(dt)
    this.stepTimer += dt
    while (this.stepTimer >= this.stepInterval() && this.state === 'playing') {
      this.stepTimer -= this.stepInterval()
      this.step()
    }
  }

  /** 奖励食物倒计时，归零消失 */
  private tickBonus(dt: number): void {
    if (this.bonus === null) return
    this.bonus.timer -= dt
    if (this.bonus.timer <= 0) {
      this.bonus = null
      this.emit({ type: 'bonusExpire' })
    }
  }

  /** 单步步进：消费 1 个队列方向 → 撞墙/撞己判定 → 移动 → 吃食结算 */
  private step(): void {
    if (this.dirQueue.length > 0) this.dir = this.dirQueue.shift()!

    const head = nextHead(this.snake, this.dir)
    if (!insideGrid(head)) return this.die()

    const grow = this.food !== null && head.x === this.food.x && head.y === this.food.y
    // 不吃食时尾格同步让位，追尾进入该格安全
    if (blocksCell(this.snake, head, !grow)) return this.die()

    this.snake = advance(this.snake, this.dir, grow)
    if (grow) {
      this.score += TUNING.foodScore
      this.eaten += 1
      this.food = spawnFood(this.snake, this.rng)
      if (this.food === null) {
        // 蛇填满整个棋盘：完美通关，按结束处理
        return this.die()
      }
      this.emit({ type: 'eat' })
      // 每吃满 bonusEvery 个普通食物刷一个限时奖励
      if (this.eaten % TUNING.bonusEvery === 0 && this.bonus === null) {
        this.spawnBonus()
      }
      return
    }

    // 奖励食物：只加分不变长（尾已在 advance 出列）
    if (this.bonus !== null && head.x === this.bonus.point.x && head.y === this.bonus.point.y) {
      this.score += TUNING.bonusScore
      this.bonus = null
      this.emit({ type: 'eatBonus' })
    }
  }

  private spawnBonus(): void {
    // food 此时已重生成；无空闲格时放弃本次奖励
    const point = this.food !== null
      ? spawnBonusFood(this.snake, this.food, this.rng)
      : null
    if (point !== null) {
      this.bonus = { point, timer: TUNING.bonusLifetimeMs }
    }
  }

  private die(): void {
    // 事件在死亡瞬间派发（音效立即响），结算遮罩等熄灭动画结束
    this.state = 'dying'
    this.dieTimer = 0
    this.emit({ type: 'gameOver' })
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event)
  }
}
