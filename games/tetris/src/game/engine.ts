import {
  clearLines,
  collides,
  createBoard,
  lockPiece,
} from './board'
import { PIECE_BOX_SIZE, PIECE_ROTATIONS, pieceCells } from './pieces'
import { createRandomizer } from './randomizer'
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

/**
 * 游戏引擎：持有全部游戏数据，只暴露命令与 update(dt)。
 * 不碰 DOM / React，可独立单测。
 */
export class Engine {
  state: EngineState = 'ready'
  board: Board = createBoard()
  piece: Piece | null = null
  private score_ = 0
  private lines_ = 0
  private level_ = 1
  private dropTimer = 0
  private softDropping = false
  private randomizer = createRandomizer()

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

  start(): void {
    this.board = createBoard()
    this.score_ = 0
    this.lines_ = 0
    this.level_ = 1
    this.dropTimer = 0
    this.softDropping = false
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
    this.tryMove({ x: this.piece.x + dir })
  }

  /**
   * v1 简单旋转：目标旋转态若碰撞则直接拒绝（无踢墙，SRS 留 v2）。
   */
  rotate(): void {
    if (this.state !== 'playing' || !this.piece) return
    this.tryMove({ rotation: (this.piece.rotation + 1) % 4 })
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
    this.lockAndSpawn()
  }

  private tryMove(delta: Partial<Pick<Piece, 'x' | 'y' | 'rotation'>>): void {
    const piece = this.piece!
    const candidate: Piece = { ...piece, ...delta }
    if (!this.collidesAt(candidate)) {
      this.piece = candidate
    }
  }

  private collidesAt(delta: Partial<Pick<Piece, 'x' | 'y' | 'rotation'>>): boolean {
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

    if (locked.toppedOut) {
      this.state = 'over'
      return
    }

    const result = clearLines(this.board)
    if (result.cleared > 0) {
      this.board = result.board
      this.lines_ += result.cleared
      this.score_ +=
        TUNING.lineScores[result.cleared] * this.level_
      this.level_ = 1 + Math.floor(this.lines_ / TUNING.linesPerLevel)
    }

    this.spawn()
  }

  private spawn(): void {
    const type = this.randomizer.next()
    const piece: Piece = {
      type,
      rotation: 0,
      x: spawnX(type),
      y: spawnY(type),
    }
    if (collides(this.board, pieceCells(piece))) {
      // 出生点即被占死：游戏结束，但仍保留方块供最终画面渲染
      this.piece = piece
      this.state = 'over'
      return
    }
    this.piece = piece
  }
}
