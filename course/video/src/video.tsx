import React from 'react';
import {AbsoluteFill, Audio, Composition, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import content from './content.json';
import lessonTimeline from './lesson-timeline.json';
import lessonCaptions from './lesson-captions.json';
import {SongContent, SONG_FRAMES} from './song';

type Scene = (typeof lessonTimeline.scenes)[number];
type Point = [number, number];
const FPS = content.fps;
const BAR_SECONDS = 4 * 60 / content.rapBpm;
const RAP_FRAMES = Math.round(content.rapBars * BAR_SECONDS * FPS);
const FONT = 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif';
const BLUE = '#60a5fa';
const BLUE_BORDER = '#2563eb';
const ORANGE = '#fdba74';
const ORANGE_BORDER = '#ea580c';
const GREEN = '#4ade80';
const GREEN_BORDER = '#15803d';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const isBody = (x: number, y: number) => (x === 5 || x === 6) && (y === 3 || y === 4);
const isArm = (x: number, y: number, point: Point, count: number) => x === point[0] && y <= point[1] && y > point[1] - count;

const Board: React.FC<{point?: Point; armCells?: number; showBody?: boolean; coordinateOnly?: boolean; dark?: boolean}> = ({point = [6, 5], armCells = 0, showBody = true, coordinateOnly = false, dark = false}) => {
  const x0 = 83, y0 = 40, cell = 68;
  const squares = [];
  for (let y = 8; y >= 0; y--) {
    for (let x = 0; x <= 8; x++) {
      const bx = x0 + x * cell, by = y0 + (8 - y) * cell;
      const body = showBody && isBody(x, y);
      const arm = !coordinateOnly && isArm(x, y, point, armCells);
      const start = x === point[0] && y === point[1] && !coordinateOnly;
      const overlap = body && arm;
      const focus = coordinateOnly && x === 5 && y === 3;
      const fill = overlap ? GREEN : arm || start ? ORANGE : body ? BLUE : focus ? '#fde68a' : dark ? '#112e46' : '#ffffff';
      const stroke = overlap ? GREEN_BORDER : arm || start ? ORANGE_BORDER : body ? BLUE_BORDER : focus ? '#d97706' : dark ? '#2b5067' : '#cbd5e1';
      squares.push(<g key={`${x}-${y}`}>
        <rect x={bx + 2} y={by + 2} width={cell - 4} height={cell - 4} rx={8} fill={fill} stroke={stroke} strokeWidth={2.4}/>
        {(overlap || start || focus) && <text x={bx + cell / 2} y={by + cell / 2 + 8} textAnchor="middle" fontFamily={FONT} fontSize={focus ? 20 : 17} fontWeight={800} fill="#0f172a">{overlap ? '重叠' : focus ? '5,3' : '拳头'}</text>}
      </g>);
    }
  }
  return <svg width={760} height={760} viewBox="0 0 760 760" role="img" aria-label="九乘九坐标棋盘">
    <rect x={0} y={0} width={760} height={760} rx={28} fill={dark ? '#092238' : '#f8fafc'}/>
    {squares}
    {Array.from({length: 9}, (_, x) => <text key={`x-${x}`} x={x0 + x * cell + cell / 2} y={y0 + 9 * cell + 34} textAnchor="middle" fontFamily={FONT} fontSize={24} fontWeight={700} fill={dark ? '#dbeafe' : '#334155'}>{x}</text>)}
    {Array.from({length: 9}, (_, i) => <text key={`y-${i}`} x={55} y={y0 + i * cell + cell / 2 + 8} textAnchor="middle" fontFamily={FONT} fontSize={24} fontWeight={700} fill={dark ? '#dbeafe' : '#334155'}>{8 - i}</text>)}
    <text x={704} y={700} fontFamily={FONT} fontSize={26} fontWeight={800} fill="#2563eb">x →</text>
    <text x={20} y={27} fontFamily={FONT} fontSize={26} fontWeight={800} fill="#2563eb">y ↑</text>
    <text x={34} y={704} fontFamily={FONT} fontSize={18} fontWeight={700} fill={dark ? '#93c5fd' : '#2563eb'}>原点</text>
  </svg>;
};

const Pill: React.FC<{text: string; color?: string}> = ({text, color = '#2563eb'}) => <span style={{display: 'inline-block', background: color, color: 'white', borderRadius: 999, padding: '10px 25px', fontSize: 28, fontWeight: 800}}>{text}</span>;

const Caption: React.FC<{text: string; dark?: boolean}> = ({text, dark = false}) => <div style={{position: 'absolute', left: 85, right: 85, bottom: 24, height: 100, borderRadius: 24, background: dark ? 'rgba(10, 29, 49, 0.92)' : 'rgba(15, 23, 42, 0.92)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px', fontFamily: FONT, fontWeight: 700, fontSize: 37, lineHeight: 1.3}}>{text}</div>;

const LessonMain: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const scene: Scene = lessonTimeline.scenes.find((s) => t >= s.start && t < s.start + s.duration) ?? lessonTimeline.scenes[lessonTimeline.scenes.length - 1];
  const local = t - scene.start;
  const point: Point = ('point' in scene && Array.isArray(scene.point) ? scene.point : [6, 5]) as Point;
  const quiz = scene.type === 'quiz';
  const revealAt = 'revealAt' in scene && typeof scene.revealAt === 'number' ? scene.revealAt : 999;
  const resultAt = 'resultAt' in scene && typeof scene.resultAt === 'number' ? scene.resultAt : 999;
  const armCells = scene.type === 'arm' || scene.type === 'example' || scene.type === 'rule' || quiz ? clamp(Math.floor((local - revealAt) / 0.25) + 1, 0, 4) : 0;
  const showResult = (quiz || scene.type === 'example') && local >= resultAt;
  const result = 'result' in scene ? scene.result : undefined;
  const caption = lessonCaptions.find((c) => t >= c.start && t < c.end)?.text || '';
  const progress = clamp(t / lessonTimeline.mainDuration, 0, 1);
  const gameScene = scene.type === 'intro' || scene.type === 'game';

  return <AbsoluteFill style={{fontFamily: FONT, background: gameScene ? '#041604' : '#eef4fa', color: '#0f172a'}}>
    <Audio src={staticFile('audio/lesson-main-new.wav')}/>
    {gameScene ? <>
      <Sequence from={0} durationInFrames={35 * fps}><OffthreadVideo src={staticFile('video/gameplay.mp4')} loop style={{position: 'absolute', left: 125, top: 130, width: 520, height: 735, objectFit: 'contain', borderRadius: 20, boxShadow: '0 0 45px rgba(57,255,110,0.3)'}}/></Sequence>
      <div style={{position: 'absolute', left: 765, top: 200, right: 100, color: '#d9ffe1'}}>
        <div style={{fontSize: 35, fontWeight: 800, color: '#39ff6e'}}>方块世界 · 少儿编程课</div>
        <div style={{fontSize: 90, fontWeight: 900, lineHeight: 1.2, marginTop: 55}}>一拳为什么<br/>会打中？</div>
        <div style={{fontSize: 40, lineHeight: 1.5, marginTop: 65, color: '#a7f3d0'}}>{scene.screen}</div>
        <div style={{marginTop: 70}}><Pill text="坐标 + 碰撞检测" color="#15803d"/></div>
      </div>
    </> : <>
      <div style={{position: 'absolute', left: 95, top: 46, fontSize: 32, fontWeight: 900, color: '#2563eb'}}>方块世界 · 编程课</div>
      <div style={{position: 'absolute', right: 95, top: 50, fontSize: 28, color: '#64748b'}}>坐标与碰撞检测</div>
      <div style={{position: 'absolute', left: 105, top: 160}}><Board point={point} armCells={armCells} showBody={scene.type !== 'coord'} coordinateOnly={scene.type === 'coord'}/></div>
      <div style={{position: 'absolute', left: 1005, top: 178, width: 805, height: 655, background: 'white', borderRadius: 30, boxShadow: '0 16px 40px rgba(15,23,42,0.08)', padding: '50px 55px'}}>
        <div style={{fontSize: 30, color: '#64748b', fontWeight: 800}}>{quiz ? '动手判断' : '观察与思考'}</div>
        <div style={{fontSize: 64, lineHeight: 1.25, fontWeight: 900, marginTop: 25}}>{scene.title}</div>
        <div style={{fontSize: 37, lineHeight: 1.5, color: '#334155', marginTop: 45, whiteSpace: 'pre-line'}}>{scene.screen}</div>
        {scene.type === 'coord' && <div style={{marginTop: 55, display: 'flex', gap: 20}}><Pill text="x 向右"/><Pill text="y 向上" color="#0f766e"/></div>}
        {scene.type === 'body' && <div style={{marginTop: 58, fontSize: 38, fontWeight: 800, color: BLUE_BORDER}}>身体＝2 列 × 2 排＝4 格</div>}
        {scene.type === 'arm' && <div style={{marginTop: 50, fontSize: 37, fontWeight: 800, color: ORANGE_BORDER}}>起点 + 向下 3 格＝4 格拳臂</div>}
        {scene.type === 'rule' && <div style={{marginTop: 60, padding: 24, background: '#ecfdf5', borderRadius: 22, fontSize: 32, fontWeight: 800, color: '#166534'}}>两个条件必须同时成立</div>}
        {quiz && local < 3 && <div style={{marginTop: 66, fontSize: 50, fontWeight: 900, color: '#ea580c'}}>想一想：{Math.max(1, 3 - Math.floor(local))} 秒后出拳</div>}
        {showResult && <div style={{marginTop: quiz ? 42 : 65}}><Pill text={result === 'hit' ? '✓ 打中：有重叠格' : '✕ 打空：没有重叠格'} color={result === 'hit' ? '#15803d' : '#b91c1c'}/></div>}
        {quiz && showResult && scene.id !== 'q4' && <Img src={staticFile(`diagrams/${scene.id}-` + (scene.id === 'q1' ? 'hit' : scene.id === 'q2' ? 'miss-side' : scene.id === 'q3' ? 'miss-far' : 'miss-edge') + '.png')} style={{position: 'absolute', right: 42, bottom: 32, width: 225, height: 225, objectFit: 'contain', opacity: 0.94}}/>}
        {scene.type === 'summary' && <div style={{marginTop: 62, fontSize: 38, color: '#15803d', fontWeight: 900}}>换个位置，也能这样判断！</div>}
      </div>
      <div style={{position: 'absolute', left: 94, bottom: 142, width: 1730, height: 8, background: '#dbeafe', borderRadius: 8}}><div style={{width: `${100 * progress}%`, height: 8, borderRadius: 8, background: '#2563eb'}}/></div>
    </>}
    {caption && <Caption text={caption} dark={gameScene}/>}
  </AbsoluteFill>;
};

const rapPoint = (bar: number): Point => {
  if (bar === 12) return [5, 5];
  if (bar === 13) return [6, 7];
  if (bar === 15) return [8, 6];
  if (bar >= 24 && bar <= 25) return [7, 5];
  if (bar >= 22 && bar <= 23) return [5, 6];
  if (bar >= 20 && bar <= 21) return [6, 8];
  if (bar >= 18 && bar <= 19) return [8, 6];
  return [6, 5];
};

const RapContent: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const bar = Math.min(content.rapBars - 1, Math.floor(t / BAR_SECONDS));
  const local = t - bar * BAR_SECONDS;
  const beat = local / (60 / content.rapBpm);
  const point = rapPoint(bar);
  const line = content.rapLines[bar];
  const pulse = 1 + 0.035 * Math.exp(-6 * (beat % 1));
  const armCells = bar >= 8 ? clamp(Math.floor(local / 0.52) + 1, 0, 4) : 0;
  return <AbsoluteFill style={{background: 'linear-gradient(135deg, #05152c 0%, #0b2848 100%)', color: 'white', fontFamily: FONT}}>
    <Audio src={staticFile('audio/rap.wav')}/>
    <div style={{position: 'absolute', top: 50, left: 100, fontSize: 36, fontWeight: 900, color: '#93c5fd'}}>坐标拳击 · 说唱复习</div>
    <div style={{position: 'absolute', top: 51, right: 95, fontSize: 28, color: '#a7f3d0'}}>92 BPM · 4/4</div>
    <div style={{position: 'absolute', left: 95, top: 155, transform: `scale(${pulse})`, transformOrigin: 'center'}}><Board point={point} armCells={armCells} showBody={bar >= 6} coordinateOnly={bar < 6} dark/></div>
    <div style={{position: 'absolute', left: 995, top: 200, width: 790, height: 620, borderRadius: 34, padding: '55px 60px', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(147,197,253,0.25)'}}>
      <div style={{fontSize: 28, fontWeight: 800, color: '#93c5fd'}}>第 {bar + 1} / 32 小节</div>
      <div style={{fontSize: 60, fontWeight: 900, lineHeight: 1.28, marginTop: 70, minHeight: 205, color: bar >= 26 ? '#86efac' : '#fff'}}>{line}</div>
      <div style={{display: 'flex', gap: 25, marginTop: 100}}>{[0, 1, 2, 3].map((i) => <div key={i} style={{width: 63, height: 63, borderRadius: '50%', background: Math.floor(beat) === i ? '#fbbf24' : '#345674', boxShadow: Math.floor(beat) === i ? '0 0 25px #fbbf24' : 'none'}}/>)}</div>
      <div style={{fontSize: 29, color: '#bfdbfe', marginTop: 27}}>一 · 二 · 三 · 四</div>
    </div>
    <div style={{position: 'absolute', bottom: 46, left: 100, right: 100, height: 14, borderRadius: 10, background: '#24436b'}}><div style={{width: `${(t / (content.rapBars * BAR_SECONDS)) * 100}%`, height: 14, borderRadius: 10, background: '#4ade80'}}/></div>
  </AbsoluteFill>;
};

export const VideoRoot: React.FC = () => <>
  <Composition id="LessonMain" component={LessonMain} durationInFrames={lessonTimeline.mainFrames} fps={FPS} width={1920} height={1080}/>
  <Composition id="Rap" component={RapContent} durationInFrames={RAP_FRAMES} fps={FPS} width={1920} height={1080}/>
  <Composition id="Song" component={SongContent} durationInFrames={SONG_FRAMES} fps={30} width={1920} height={1080}/>
</>;
