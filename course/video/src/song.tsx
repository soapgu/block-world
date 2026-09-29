import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import timeline from './song-timeline.json';

type Point = [number, number];
type Line = (typeof timeline.lyrics)[number];
const FONT = 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif';
const BLUE = '#60a5fa';
const ORANGE = '#fb923c';
const GREEN = '#4ade80';
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export const SONG_FRAMES = Math.ceil(timeline.audioDuration * timeline.fps);

const getPoint = (line: Line | undefined): Point => {
  if (!line) return [6, 5];
  if (line.id === 14 || line.id === 23 || line.id === 24) return [8, 6];
  return [6, 5];
};

const SongBoard: React.FC<{point: Point; armCells: number; range: boolean}> = ({point, armCells, range}) => {
  const cell = 70, x0 = 76, y0 = 56;
  return <svg width={760} height={760} viewBox="0 0 760 760" role="img" aria-label="拳击坐标棋盘">
    <rect width="760" height="760" rx="32" fill="#0a2138" stroke="#254766" strokeWidth="3"/>
    {Array.from({length: 9}, (_, row) => Array.from({length: 9}, (_, x) => {
      const y = 8 - row;
      const body = (x === 5 || x === 6) && (y === 3 || y === 4);
      const arm = x === point[0] && y <= point[1] && y > point[1] - armCells;
      const overlap = body && arm;
      const fill = overlap ? GREEN : arm ? ORANGE : body ? BLUE : '#102c45';
      const stroke = overlap ? '#15803d' : arm ? '#ea580c' : body ? '#2563eb' : '#31516b';
      return <g key={`${x}-${y}`}>
        <rect x={x0 + x * cell + 2} y={y0 + row * cell + 2} width={cell - 4} height={cell - 4} rx="8" fill={fill} stroke={stroke} strokeWidth="2"/>
        {overlap && <circle cx={x0 + x * cell + cell / 2} cy={y0 + row * cell + cell / 2} r="13" fill="#14532d"/>}
      </g>;
    }))}
    {Array.from({length: 9}, (_, n) => <g key={n} fontFamily={FONT} fontSize="25" fontWeight="700" fill="#cbd5e1">
      <text x={x0 + n * cell + cell / 2} y="727" textAnchor="middle">{n}</text>
      <text x="45" y={y0 + (8 - n) * cell + 44} textAnchor="middle">{n}</text>
    </g>)}
    <text x="695" y="730" fontFamily={FONT} fontSize="26" fontWeight="800" fill="#93c5fd">x →</text>
    <text x="18" y="40" fontFamily={FONT} fontSize="26" fontWeight="800" fill="#93c5fd">y ↑</text>
    {range && <rect x="424" y="124" width="145" height="215" rx="10" fill="none" stroke="#fbbf24" strokeWidth="5" strokeDasharray="11 8"/>}
  </svg>;
};

const KEYWORDS = ['对准', '够到', '有重叠'];

export const SongContent: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const line = timeline.lyrics.find((item) => time >= item.start && time < item.end);
  const local = line ? time - line.start : 0;
  const point = getPoint(line);
  const showArm = !!line && line.id >= 9;
  const armCells = showArm ? clamp(Math.floor((local - 0.15) / 0.42) + 1, 0, 4) : 0;
  const range = !!line && (line.id === 15 || line.id === 16);
  const hit = armCells >= 2 && point[0] === 6;
  const activeKeyword = line?.text.includes('对准、够到、有重叠') ? Math.min(2, Math.floor(local / ((line.end - line.start) / 3))) :
    line?.text.startsWith('对准') ? 0 : line?.text.startsWith('够到') ? 1 : line?.text.includes('重叠') ? 2 : -1;

  return <AbsoluteFill style={{fontFamily: FONT, color: '#f8fafc', background: 'radial-gradient(circle at 20% 45%, #123a5b 0%, #081b30 45%, #061321 100%)'}}>
    <Audio src={staticFile('audio/boxing-song-final.mp3')}/>
    <div style={{position: 'absolute', left: 90, top: 55, fontSize: 34, fontWeight: 900, color: '#93c5fd'}}>方块世界 · 坐标拳击</div>
    <div style={{position: 'absolute', right: 95, top: 57, fontSize: 27, color: '#a7f3d0'}}>歌曲复习 · 坐标与碰撞检测</div>
    <div style={{position: 'absolute', left: 92, top: 153}}><SongBoard point={point} armCells={armCells} range={range}/></div>
    <div style={{position: 'absolute', left: 934, top: 157, width: 893, height: 755, borderRadius: 34, boxSizing: 'border-box', padding: '50px 54px', background: 'rgba(255,255,255,0.075)', border: '2px solid rgba(147,197,253,0.22)'}}>
      <div style={{fontSize: 30, color: '#93c5fd', fontWeight: 800}}>{line?.note ?? '一拳为什么会打中？'}</div>
      <div style={{marginTop: 68, minHeight: 235, fontSize: 58, fontWeight: 900, lineHeight: 1.32, display: 'flex', alignItems: 'center'}}>{line?.text ?? '坐标拳击'}</div>
      <div style={{display: 'flex', gap: 13, marginTop: 48}}>{KEYWORDS.map((word, i) => <div key={word} style={{padding: '13px 19px', borderRadius: 16, background: activeKeyword === i ? '#22c55e' : '#24435b', color: activeKeyword === i ? '#052e16' : '#cbd5e1', fontSize: 31, fontWeight: 900, boxShadow: activeKeyword === i ? '0 0 24px rgba(74,222,128,0.5)' : 'none'}}>{word}</div>)}</div>
      {line?.id === 13 && hit && <div style={{marginTop: 43, color: '#86efac', fontSize: 36, fontWeight: 900}}>(6,5) → 打中 ✓</div>}
      {line?.id === 14 && armCells === 4 && <div style={{marginTop: 43, color: '#fdba74', fontSize: 36, fontWeight: 900}}>(8,6) → 打空 ✕</div>}
      {range && <div style={{marginTop: 29, padding: '17px 20px', borderRadius: 16, background: '#45351d', fontSize: 27, lineHeight: 1.38, color: '#fde68a', fontWeight: 700}}>x=5～6，y=5～7<br/>仅限本课身体固定、从上方向下出拳</div>}
      {!range && line?.id === 10 && <div style={{marginTop: 34, fontSize: 30, color: '#fdba74'}}>起点 + 向下 3 格 = 拳臂 4 格</div>}
    </div>
    <div style={{position: 'absolute', left: 95, bottom: 66, display: 'flex', gap: 30, fontSize: 26, fontWeight: 800}}><span style={{color: BLUE}}>■ 身体</span><span style={{color: ORANGE}}>■ 拳臂</span><span style={{color: GREEN}}>■ 重叠</span></div>
    <div style={{position: 'absolute', left: 95, right: 95, bottom: 30, height: 9, borderRadius: 10, background: '#27455f'}}><div style={{height: '100%', width: `${clamp(time / timeline.audioDuration, 0, 1) * 100}%`, borderRadius: 10, background: GREEN}}/></div>
  </AbsoluteFill>;
};
