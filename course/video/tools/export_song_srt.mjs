import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const timeline = JSON.parse(readFileSync(resolve(root, 'src/song-timeline.json'), 'utf8'));
const stamp = (seconds) => {
  const total = Math.round(seconds * 1000);
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor(total / 60000) % 60;
  const secs = Math.floor(total / 1000) % 60;
  const millis = total % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

for (const [index, line] of timeline.lyrics.entries()) {
  if (!(line.start >= 0 && line.end > line.start && line.end <= timeline.audioDuration)) {
    throw new Error(`歌词 ${index + 1} 时间无效`);
  }
  if (index && line.start < timeline.lyrics[index - 1].end) {
    throw new Error(`歌词 ${index + 1} 与上一句重叠`);
  }
}

const srt = timeline.lyrics.map((line, i) => `${i + 1}\n${stamp(line.start)} --> ${stamp(line.end)}\n${line.text}`).join('\n\n') + '\n';
writeFileSync(resolve(root, 'out/说唱版.srt'), srt);
