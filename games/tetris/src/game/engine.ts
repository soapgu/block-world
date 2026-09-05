import {
  clearLines,
  collides,
  createBoard,
  isTSpin,
  lockPiece,
} from './board'
import { PIECE_BOX_SIZE, PIECE_ROTATIONS, pieceCells, rotationCandidates } from './pieces'
import { createRandomizer } from './randomizer'
import type { Randomizer } from './randomizer'
import { dropIntervalForLevel, TUNING } from './tuning'
import type { Board, EngineState, Piece, PieceType, Stats } from './types'
import { BOARD_WIDTH } from './types'

/** 出生列：包围盒在棋盘上水平居中 */
function spawnX(type: PieceType): number {
  return Math.floor((BOARD_WIDTH - PIECE_BOX_SIZE[type]) / 2)
}

/** 出生行：让旋转态 0 的最上格恰好贴住场地顶边（部分形状因此悬出负行） */
function spawnY(type: PieceType): number {
  const cells = PIECE_ROTATIONS[type][0]
  // 用 0 - x 而非 -x，避免 min 为 0 时得到 -0
  return 0 - Math.min(...cells.map(([, y]) => y))
}

/** Next 预览显示的方块数 */
const NEXT_PREVIEW = 3
/** 发牌队列最小长度：即将出场 1 块 + 预览 3 块 */
const QUEUE_MIN = 1 + NEXT_PREVIEW

/** React 外壳需要的低频 UI 数据（每帧浅比较后同步） */
export interface UiSnapshot extends Stats {
  state: EngineState
  hold: PieceType | null
  next: readonly PieceType[]
}

/** 引擎在关键节点派发的游戏事件（音效/特效从这里订阅，不参与游戏逻辑） */
export type GameEvent =
  | { type: 'move' }
  | { type: 'rotate' }
  | { type: 'hold' }
  | { type: 'hardDrop' }
  | { type: 'lock' }
  | { type: 'clear'; lines: number } // 消 1~3 行
  | { type: 'tetris' } // 四消
  | { type: 'levelUp' }
  | { type: 'gameOver' }

export interface EngineOptions {
  /** 注入发牌器（测试用固定序列） */
  randomizer?: Randomizer
}

/**
 * 游戏引擎：持有全部游戏数据，只暴露命令与 update(dt)。
 * 不碰 DOM / React，可独立单测。
 */
export class Engine {
  state: EngineState = 'ready'
  board: Board = createBoard()
  piece: Piece | null = null
  hold: PieceType | null = null
  /** 每块落定前是否已用过 Hold（每锁定一次复位） */
  holdUsed = false
  /** 消行动画：正在消除的行号（空数组表示不在动画中） */
  clearingRows: readonly number[] = []
  /** 消行动画已进行的时间（ms），渲染层据此闪烁 */
  clearTimer = 0
  /** 事件监听器列表：音效/最高分等都从这里订阅，可多个共存 */
  private listeners: Array<(event: GameEvent) => void> = []

  /** 订阅游戏事件，返回退订函数 */
  subscribe(listener: (event: GameEvent) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /** 兼容单回调写法：赋值即订阅（覆盖旧值） */
  set onEvent(listener: ((event: GameEvent) => void) | undefined) {
    this.listeners = listener ? [listener] : []
  }

  get onEvent(): ((event: GameEvent) => void) | undefined {
    return this.listeners[0]
  }

  private score_ = 0
  private lines_ = 0
  private level_ = 1
  private dropTimer = 0
  private softDropping = false
  private lockTimer = 0
  private lockResets = 0
  /** 最后一次成功操作是否为旋转（T-Spin 判定条件之一） */
  private lastActionWasRotation = false
  /** 消行动画期间暂存的「塌落后」棋盘，动画结束时生效 */
  private stashedBoard: Board | null = null
  private queue: PieceType[] = []
  private readonly randomizer: Randomizer

  constructor(options: EngineOptions = {}) {
    this.randomizer = options.randomizer ?? createRandomizer()
    this.refillQueue() // ready 界面即可展示 Next 预览
  }

  get score(): number {
    return this.score_
  }

  get lines(): number {
    return this.lines_
  }

  get level(): number {
    return this.level_
  }

  getStats(): Stats {
    return { score: this.score_, lines: this.lines_, level: this.level_ }
  }

  getUiSnapshot(): UiSnapshot {
    return {
      score: this.score_,
      lines: this.lines_,
      level: this.level_,
      state: this.state,
      hold: this.hold,
      next: this.queue.slice(0, NEXT_PREVIEW),
    }
  }

  start(): void {
    this.board = createBoard()
    this.score_ = 0
    this.lines_ = 0
    this.level_ = 1
    this.dropTimer = 0
    this.softDropping = false
    this.piece = null
    this.hold = null
    this.holdUsed = false
    this.clearingRows = []
    this.clearTimer = 0
    this.stashedBoard = null
    // 发牌队列不在重开时清空：构造时已预填，重开后序列延续（无尽袋语义）
    this.state = 'playing'
    this.spawn()
  }

  togglePause(): void {
    if (this.state === 'playing') this.state = 'paused'
    else if (this.state === 'paused') this.state = 'playing'
  }

  /** 每帧推进（dt 毫秒）。仅在 playing 状态生效。 */
  update(dt: number): void {
    if (this.state !== 'playing') return

    // 消行动画：不出新块、不推进重力
    if (this.stashedBoard !== null) {
      this.clearTimer += dt
      const duration = this.clearDuration()
      if (this.clearTimer >= duration) this.finishClear()
      return
    }

    if (!this.piece) return

    // 触底：锁定延迟计时（期间可继续滑动/旋转）
    if (this.isGrounded()) {
      this.lockTimer += dt
      if (this.lockTimer >= TUNING.lockDelay) this.lockAndSpawn()
      return
    }

    // 空中：重力推进
    const gravity = dropIntervalForLevel(this.level_)
    const interval = this.softDropping
      ? Math.min(TUNING.softDropInterval, gravity)
      : gravity
    this.dropTimer += dt
    while (
      this.dropTimer >= interval &&
      this.state === 'playing' &&
      this.piece !== null &&
      this.stashedBoard === null
    ) {
      this.dropTimer -= interval
      if (!this.stepDown()) break // 触底，交给锁定延迟
      if (this.softDropping) this.score_ += TUNING.softDropBonus
    }
  }

  /** 左右移动，dir 为 -1 / 1 */
  moveX(dir: -1 | 1): void {
    if (this.state !== 'playing' || !this.piece) return
    const candidate: Piece = { ...this.piece, x: this.piece.x + dir }
    if (!collides(this.board, pieceCells(candidate))) {
      this.piece = candidate
      this.lastActionWasRotation = false
      this.onPieceMoved()
      this.emit({ type: 'move' })
    }
  }

  /**
   * SRS 旋转：按踢墙表依次尝试候选位置，第一个不碰撞的生效；
   * 全部碰撞则旋转失败。dir 为 1（顺时针）/ -1（逆时针）。
   */
  rotate(dir: 1 | -1 = 1): void {
    if (this.state !== 'playing' || !this.piece) return
    for (const candidate of rotationCandidates(this.piece, dir)) {
      if (!collides(this.board, pieceCells(candidate))) {
        this.piece = candidate
        this.lastActionWasRotation = true
        this.onPieceMoved()
        this.emit({ type: 'rotate' })
        return
      }
    }
  }

  /** 软降开关：按住 ↓ 时钳制下落间隔 */
  setSoftDrop(on: boolean): void {
    this.softDropping = on
  }

  /** 硬降：瞬移到底并立即锁定（无视锁定延迟） */
  hardDrop(): void {
    if (this.state !== 'playing' || !this.piece) return
    let cells = 0
    while (!this.collidesAt({ y: this.piece.y + 1 })) {
      this.piece.y += 1
      cells += 1
    }
    this.score_ += cells * TUNING.hardDropBonus
    this.lastActionWasRotation = false
    this.emit({ type: 'hardDrop' })
    this.lockAndSpawn()
  }

  /** Hold 暂存：当前块与暂存槽互换；每块落定前只能用一次 */
  holdPiece(): void {
    if (this.state !== 'playing' || !this.piece || this.holdUsed) return
    const swap = this.hold
    this.hold = this.piece.type
    this.holdUsed = true
    this.dropTimer = 0
    this.lockTimer = 0
    this.lockResets = 0
    this.emit({ type: 'hold' })
    if (swap === null) {
      this.spawn()
    } else {
      this.setPiece(swap)
    }
  }

  /** 消行动画总时长（四消更久，强化打击感） */
  clearDuration(): number {
    return this.clearingRows.length >= 4
      ? TUNING.tetrisAnimMs
      : TUNING.clearAnimMs
  }

  private onPieceMoved(): void {
    if (this.isGrounded()) {
      // 触底状态下的调整：有限次刷新锁定计时
      if (this.lockResets < TUNING.lockResets) {
        this.lockTimer = 0
        this.lockResets += 1
      }
    } else {
      // 滑出边缘重新下落：计时与次数全部重置
      this.lockTimer = 0
      this.lockResets = 0
    }
  }

  private isGrounded(): boolean {
    return this.piece !== null && this.collidesAt({ y: this.piece.y + 1 })
  }

  /** 重力下落一格；返回是否成功（失败表示触底） */
  private stepDown(): boolean {
    if (this.collidesAt({ y: this.piece!.y + 1 })) return false
    this.piece!.y += 1
    if (this.isGrounded()) this.lockTimer = 0 // 落地：锁定计时从零开始
    return true
  }

  private collidesAt(
    delta: Partial<Pick<Piece, 'x' | 'y' | 'rotation'>>,
  ): boolean {
    const piece = this.piece!
    return collides(this.board, pieceCells({ ...piece, ...delta }))
  }

  private lockAndSpawn(): void {
    const piece = this.piece!
    const tspin = isTSpin(this.board, piece, this.lastActionWasRotation)
    const locked = lockPiece(this.board, piece)
    this.board = locked.board
    this.dropTimer = 0
    this.lockTimer = 0
    this.lockResets = 0
    this.holdUsed = false
    this.emit({ type: 'lock' })

    if (locked.toppedOut) {
      this.state = 'over'
      this.emit({ type: 'gameOver' })
      return
    }

    const result = clearLines(this.board)
    if (result.clearedRows.length > 0) {
      const cleared = result.clearedRows.length
      this.lines_ += cleared
      if (tspin) {
        this.score_ += TUNING.tspinScores[cleared] * this.level_
      } else {
        this.score_ += TUNING.lineScores[cleared] * this.level_
      }
      const prevLevel = this.level_
      this.level_ = 1 + Math.floor(this.lines_ / TUNING.linesPerLevel)
      if (cleared >= 4) {
        this.emit({ type: 'tetris' })
      } else {
        this.emit({ type: 'clear', lines: cleared })
      }
      if (this.level_ > prevLevel) this.emit({ type: 'levelUp' })
      // 进入消行动画：棋盘保持塌落前状态供闪烁渲染
      this.clearingRows = result.clearedRows
      this.clearTimer = 0
      this.stashedBoard = result.board
      this.piece = null
      return
    }

    this.spawn()
  }

  private finishClear(): void {
    this.board = this.stashedBoard!
    this.stashedBoard = null
    this.clearingRows = []
    this.clearTimer = 0
    this.spawn()
  }

  private spawn(): void {
    this.refillQueue()
    const type = this.queue.shift()!
    this.setPiece(type)
  }

  private setPiece(type: PieceType): void {
    const piece: Piece = {
      type,
      rotation: 0,
      x: spawnX(type),
      y: spawnY(type),
    }
    this.lastActionWasRotation = false
    this.lockTimer = 0
    this.lockResets = 0
    if (collides(this.board, pieceCells(piece))) {
      // 出生点即被占死：游戏结束，但仍保留方块供最终画面渲染
      this.piece = piece
      this.state = 'over'
      this.emit({ type: 'gameOver' })
      return
    }
    this.piece = piece
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  private refillQueue(): void {
    while (this.queue.length < QUEUE_MIN) {
      this.queue.push(this.randomizer.next())
    }
  }
}
