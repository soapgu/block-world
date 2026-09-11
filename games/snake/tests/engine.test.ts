import { describe, expect, it } from 'vitest'
import { Engine } from '../src/game/engine'
import type { GameEvent } from '../src/game/engine'
import { TUNING } from '../src/game/tuning'
import type { SnakeBody } from '../src/game/snake'

function createEngine(): Engine {
  // rng=0：食物固定落在第一个空闲格，便于复现
  return new Engine({ rng: () => 0 })
}

describe('Engine 基础', () => {
  it('初始 ready，start 后 playing 且重置', () => {
    const engine = createEngine()
    expect(engine.state).toBe('ready')
    engine.start()
    expect(engine.state).toBe('playing')
    expect(engine.score).toBe(0)
    expect(engine.length).toBe(TUNING.initialLength)
    expect(engine.food).toEqual({ x: 0, y: 0 })
    expect(engine.getUiSnapshot()).toEqual({
      state: 'playing',
      score: 0,
      length: 3,
    })
  })

  it('update 在非 playing 状态不生效', () => {
    const engine = createEngine()
    engine.update(1000)
    expect(engine.state).toBe('ready')
    expect(engine.snake[0]).toEqual({ x: 10, y: 10 })
  })
})

describe('移动与吃食', () => {
  it('按间隔步进移动，吃食计分 10 并变长', () => {
    const engine = createEngine()
    engine.start()
    engine.food = { x: 11, y: 10 } // 正前方
    engine.update(200)
    expect(engine.snake[0]).toEqual({ x: 11, y: 10 })
    expect(engine.score).toBe(10)
    expect(engine.length).toBe(4)
    expect(engine.eaten).toBe(1)
    // 食物重新生成（rng=0 → 第一个空闲格），且不在蛇身上
    expect(engine.food).toEqual({ x: 0, y: 0 })
  })

  it('不足一个间隔不动，跨多个间隔连走多步', () => {
    const engine = createEngine()
    engine.start()
    engine.food = { x: 0, y: 0 } // 远处，路上吃不到
    engine.update(199)
    expect(engine.snake[0]).toEqual({ x: 10, y: 10 })
    engine.update(200)
    expect(engine.snake[0]).toEqual({ x: 11, y: 10 })
    engine.update(400)
    expect(engine.snake[0]).toEqual({ x: 13, y: 10 })
  })
})

describe('加速曲线', () => {
  it('间隔随进食线性缩短，钳到下限', () => {
    const engine = createEngine()
    engine.start()
    expect(engine.stepInterval()).toBe(200)
    engine.eaten = 1
    expect(engine.stepInterval()).toBe(196)
    engine.eaten = 32
    expect(engine.stepInterval()).toBe(72)
    engine.eaten = 33
    expect(engine.stepInterval()).toBe(TUNING.minInterval)
    engine.eaten = 100
    expect(engine.stepInterval()).toBe(TUNING.minInterval)
  })
})

describe('方向队列', () => {
  it('180° 回头输入被丢弃', () => {
    const engine = createEngine()
    engine.start()
    engine.turn('left') // 当前朝右
    engine.update(200)
    expect(engine.snake[0]).toEqual({ x: 11, y: 10 })
    expect(engine.state).toBe('playing')
  })

  it('与当前方向相同的输入被丢弃（重复转向不占队列）', () => {
    const engine = createEngine()
    engine.start()
    engine.turn('right') // 当前朝右，重复右转应被丢弃
    engine.turn('up') // 队列里只应有 up 一个
    engine.update(400) // 第一步消费 up，第二步仍 up（没有多余 right）
    expect(engine.snake[0]).toEqual({ x: 10, y: 8 })
    expect(engine.state).toBe('playing')
  })

  it('快速连按 ↑← 只逐步生效，不误死', () => {
    const engine = createEngine()
    engine.start()
    engine.food = { x: 0, y: 0 }
    engine.turn('up')
    engine.turn('left')
    engine.update(400) // 两步：先上、再左
    expect(engine.snake[0]).toEqual({ x: 9, y: 9 })
    expect(engine.state).toBe('playing')
  })

  it('队列容量 2：第三个有效输入被丢弃', () => {
    const engine = createEngine()
    engine.start()
    engine.food = { x: 0, y: 0 }
    engine.turn('up')
    engine.turn('left')
    engine.turn('down') // 队列已满（相对 left 有效），应被丢弃
    engine.update(600) // 三步：up、left、left（down 未入队）
    expect(engine.snake[0]).toEqual({ x: 8, y: 9 })
    expect(engine.state).toBe('playing')
  })
})

describe('死亡判定', () => {
  it('撞墙结束并发 gameOver 事件', () => {
    const engine = createEngine()
    const events: GameEvent[] = []
    engine.subscribe((e) => events.push(e))
    engine.start()
    engine.turn('up')
    engine.update(200 * 11) // 从 y=10 向上，第 11 步出界
    expect(engine.state).toBe('dying')
    engine.update(500) // 熄灭动画结束
    expect(engine.state).toBe('over')
    expect(events).toEqual([{ type: 'gameOver' }])
  })

  it('撞自己身体结束', () => {
    const engine = createEngine()
    engine.start()
    // 手工构造：头 (10,10) 上方 (10,9) 是身体中段（非尾格）
    const snake: SnakeBody = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 11, y: 9 },
      { x: 10, y: 9 },
      { x: 9, y: 9 },
    ]
    engine.snake = snake
    engine.dir = 'up'
    engine.update(200)
    engine.update(500) // 熄灭动画结束
    expect(engine.state).toBe('over')
  })

  it('不吃食时追尾进入尾格是安全的', () => {
    const engine = createEngine()
    engine.start()
    // 尾格 (10,9) 恰在头上方：尾让位后进入不死
    const snake: SnakeBody = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 11, y: 9 },
      { x: 10, y: 9 },
    ]
    engine.snake = snake
    engine.dir = 'up'
    engine.update(200)
    expect(engine.state).toBe('playing')
    expect(engine.snake[0]).toEqual({ x: 10, y: 9 })
    expect(engine.length).toBe(4)
  })

  it('吃满全盘（食物耗尽）按结束处理', () => {
    const engine = createEngine()
    engine.start()
    // 蛇铺满除 (11,10) 外的整盘，食物就在 (11,10)
    const snake: SnakeBody = [{ x: 10, y: 10 }]
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        if ((x === 10 && y === 10) || (x === 11 && y === 10)) continue
        snake.push({ x, y })
      }
    }
    engine.snake = snake
    engine.food = { x: 11, y: 10 }
    engine.update(200)
    engine.update(500) // 熄灭动画结束
    expect(engine.state).toBe('over')
    expect(engine.food).toBeNull()
  })
})

/** 喂食辅助：把普通食物放到蛇头正前方一步并推进一个间隔（必然吃到） */
function eatOnce(engine: Engine): void {
  engine.food = { x: engine.snake[0].x + 1, y: engine.snake[0].y }
  engine.update(200)
}

describe('奖励食物', () => {
  it('每吃满 5 个普通食物出现一个限时奖励', () => {
    const engine = createEngine()
    engine.start()
    expect(engine.bonus).toBeNull()
    for (let i = 0; i < 4; i++) eatOnce(engine) // 吃 4 个：无奖励
    expect(engine.bonus).toBeNull()
    eatOnce(engine) // 第 5 个：出奖励
    expect(engine.bonus).not.toBeNull()
    expect(engine.bonus!.timer).toBeGreaterThan(0)
  })

  it('吃奖励 +50 分且蛇身不变长', () => {
    const engine = createEngine()
    engine.start()
    for (let i = 0; i < 5; i++) eatOnce(engine)
    const lenBefore = engine.length
    const scoreBefore = engine.score
    // 手工把奖励放到蛇头正前方一步
    engine.bonus = { point: { x: engine.snake[0].x + 1, y: engine.snake[0].y }, timer: 3000 }
    engine.update(200)
    expect(engine.score).toBe(scoreBefore + 50)
    expect(engine.length).toBe(lenBefore) // 不变长
    expect(engine.bonus).toBeNull()
  })

  it('奖励超时消失且不得分，派发 bonusExpire 事件', () => {
    const engine = createEngine()
    const events: GameEvent[] = []
    engine.subscribe((e) => events.push(e))
    engine.start()
    engine.bonus = { point: { x: 5, y: 5 }, timer: 100 }
    engine.update(101) // 超时，但不足一个步进间隔（蛇不动）
    expect(engine.bonus).toBeNull()
    expect(engine.score).toBe(0)
    expect(events).toContainEqual({ type: 'bonusExpire' })
  })

  it('吃奖励派发 eatBonus 事件', () => {
    const engine = createEngine()
    const events: GameEvent[] = []
    engine.subscribe((e) => events.push(e))
    engine.start()
    for (let i = 0; i < 5; i++) eatOnce(engine)
    engine.bonus = { point: { x: engine.snake[0].x + 1, y: engine.snake[0].y }, timer: 3000 }
    engine.update(200)
    expect(events).toContainEqual({ type: 'eatBonus' })
  })
})

describe('暂停', () => {
  it('togglePause 在 playing/paused 间切换', () => {
    const engine = createEngine()
    engine.start()
    engine.togglePause()
    expect(engine.state).toBe('paused')
    engine.togglePause()
    expect(engine.state).toBe('playing')
  })

  it('暂停时 update 完全冻结：蛇不动、奖励计时不减、不死亡', () => {
    const engine = createEngine()
    engine.start()
    for (let i = 0; i < 5; i++) eatOnce(engine)
    expect(engine.bonus).not.toBeNull()
    const headBefore = { ...engine.snake[0] }
    const timerBefore = engine.bonus!.timer

    engine.togglePause()
    engine.update(60000)
    expect(engine.state).toBe('paused')
    expect(engine.snake[0]).toEqual(headBefore)
    expect(engine.bonus!.timer).toBe(timerBefore)

    // 恢复后继续：奖励倒计时恢复扣减
    engine.togglePause()
    engine.update(100)
    expect(engine.bonus!.timer).toBe(timerBefore - 100)
  })
})

describe('死亡熄灭动画', () => {
  function dieByWall(engine: Engine): void {
    engine.start()
    engine.turn('up')
    engine.update(200 * 11) // 从 y=10 向上，第 11 步出界
  }

  it('死亡先进入 dying（非直接 over），gameOver 事件只派发一次', () => {
    const engine = createEngine()
    const events: GameEvent[] = []
    engine.subscribe((e) => events.push(e))
    dieByWall(engine)
    expect(engine.state).toBe('dying')
    expect(events).toEqual([{ type: 'gameOver' }])
  })

  it('dying 期间 update 只推进动画：蛇不动、奖励不减', () => {
    const engine = createEngine()
    dieByWall(engine)
    const head = { ...engine.snake[0] }
    engine.update(200)
    expect(engine.state).toBe('dying')
    expect(engine.snake[0]).toEqual(head)
  })

  it('dying 期间 turn 无效', () => {
    const engine = createEngine()
    dieByWall(engine)
    const head = { ...engine.snake[0] }
    engine.turn('down')
    engine.update(200)
    expect(engine.snake[0]).toEqual(head)
  })

  it('动画进度 0~1 递增，到 500ms 转为 over', () => {
    const engine = createEngine()
    dieByWall(engine)
    expect(engine.dyingProgress()).toBe(0)
    engine.update(250)
    expect(engine.dyingProgress()).toBe(0.5)
    expect(engine.state).toBe('dying')
    engine.update(249)
    expect(engine.state).toBe('dying') // 499ms，尚差 1ms
    engine.update(1)
    expect(engine.state).toBe('over')
    expect(engine.dyingProgress()).toBe(0) // 非 dying 状态恒 0
  })

  it('dying 结束后回车可重开', () => {
    const engine = createEngine()
    dieByWall(engine)
    engine.update(500)
    expect(engine.state).toBe('over')
    engine.start()
    expect(engine.state).toBe('playing')
    expect(engine.score).toBe(0)
  })

  it('非 dying 状态 dyingProgress 恒为 0', () => {
    const engine = createEngine()
    engine.start()
    expect(engine.dyingProgress()).toBe(0)
  })
})

describe('事件', () => {
  it('eat / gameOver 按序派发，退订后不再收到', () => {
    const engine = createEngine()
    const events: GameEvent[] = []
    const off = engine.subscribe((e) => events.push(e))
    engine.start()
    engine.food = { x: 11, y: 10 }
    engine.update(200) // 吃食
    engine.turn('up')
    engine.update(200 * 11) // 撞墙
    expect(events).toEqual([{ type: 'eat' }, { type: 'gameOver' }])
    off()
    engine.start()
    engine.update(200)
    expect(events).toHaveLength(2)
  })
})
