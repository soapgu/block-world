import {
  clearLines,
  collides,
  createBoard,
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
  return -Math.min(...cells.map(([, y]) => y))
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
  private score_ = 0
  private lines_ = 0
  private level_ = 1
  private dropTimer = 0
  private softDropping = false
  /** 最后一次成功操作是否为旋转（T-Spin 判定条件之一） */
  private lastActionWasRotation = false
  private queue: PieceType[] = []
  private readonly randomizer: Randomizer

  constructor(options: EngineOptions = {}) {
    this.randomizer = options.randomizer ?? createRandomizer()
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
    this.queue = []
    this.state = 'playing'
    this.spawn()
  }

  togglePause(): void {
    if (this.state === 'playing') this.state = 'paused'
    else if (this.state === 'paused') this.state = 'playing'
  }

  /** 每帧推进（dt 毫秒）。仅在 playing 状态生效。 */
  update(dt: number): void {
    if (this.state !== 'playing' || !this.piece) return
    const gravity = dropIntervalForLevel(this.level_)
    const interval = this.softDropping
      ? Math.min(TUNING.softDropInterval, gravity)
      : gravity
    this.dropTimer += dt
    while (this.dropTimer >= interval && this.state === 'playing') {
      this.dropTimer -= interval
      this.stepDown()
    }
  }

  /** 左右移动，dir 为 -1 / 1 */
  moveX(dir: -1 | 1): void {
    if (this.state !== 'playing' || !this.piece) return
    const candidate: Piece = { ...this.piece, x: this.piece.x + dir }
    if (!collides(this.board, pieceCells(candidate))) {
      this.piece = candidate
      this.lastActionWasRotation = false
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
        return
      }
    }
  }

  /** 软降开关：按住 ↓ 时钳制下落间隔 */
  setSoftDrop(on: boolean): void {
    this.softDropping = on
  }

  /** 硬降：瞬移到底并立即锁定 */
  hardDrop(): void {
    if (this.state !== 'playing' || !this.piece) return
    while (!this.collidesAt({ y: this.piece.y + 1 })) {
      this.piece.y += 1
    }
    this.lastActionWasRotation = false
    this.lockAndSpawn()
  }

  /** Hold 暂存：当前块与暂存槽互换；每块落定前只能用一次 */
  holdPiece(): void {
    if (this.state !== 'playing' || !this.piece || this.holdUsed) return
    const swap = this.hold
    this.hold = this.piece.type
    this.holdUsed = true
    this.dropTimer = 0
    if (swap === null) {
      this.spawn()
    } else {
      this.setPiece(swap)
    }
  }

  private collidesAt(
    delta: Partial<Pick<Piece, 'x' | 'y' | 'rotation'>>,
  ): boolean {
    const piece = this.piece!
    return collides(this.board, pieceCells({ ...piece, ...delta }))
  }

  private stepDown(): void {
    if (!this.collidesAt({ y: this.piece!.y + 1 })) {
      this.piece!.y += 1
      return
    }
    // v1 到底即锁（无锁定延迟），还原掌机手感
    this.lockAndSpawn()
  }

  private lockAndSpawn(): void {
    const piece = this.piece!
    const locked = lockPiece(this.board, piece)
    this.board = locked.board
    this.dropTimer = 0
    this.holdUsed = false

    if (locked.toppedOut) {
      this.state = 'over'
      return
    }

    const result = clearLines(this.board)
    if (result.cleared > 0) {
      this.board = result.board
      this.lines_ += result.cleared
      this.score_ += TUNING.lineScores[result.cleared] * this.level_
      this.level_ = 1 + Math.floor(this.lines_ / TUNING.linesPerLevel)
    }

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
    if (collides(this.board, pieceCells(piece))) {
      // 出生点即被占死：游戏结束，但仍保留方块供最终画面渲染
      this.piece = piece
      this.state = 'over'
      return
    }
    this.piece = piece
  }

  private refillQueue(): void {
    while (this.queue.length < QUEUE_MIN) {
      this.queue.push(this.randomizer.next())
    }
  }
}
