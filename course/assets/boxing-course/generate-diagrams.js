const fs = require('fs');
const path = require('path');
const out = __dirname;
const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8], rows = [8, 7, 6, 5, 4, 3, 2, 1, 0];
const cell = 46, ox = 90, oy = 100;
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function diagram({title, subtitle, punch = null, showArm = false, result = null, overview = false, blank = false}) {
  const body = new Set(['5,3', '6,3', '5,4', '6,4']), arm = new Set();
  if (punch && showArm) for (let y = punch.y; y >= punch.y - 3; y--) arm.add(`${punch.x},${y}`);
  const overlap = new Set([...arm].filter((p) => body.has(p))), hit = overlap.size > 0;
  let cells = '';
  for (let ri = 0; ri < rows.length; ri++) for (let ci = 0; ci < cols.length; ci++) {
    const x = cols[ci], y = rows[ri], key = `${x},${y}`, px = ox + ci * cell, py = oy + ri * cell;
    let fill = '#ffffff', stroke = '#cbd5e1', label = '';
    if (body.has(key)) { fill = '#60a5fa'; stroke = '#2563eb'; label = '身体'; }
    if (arm.has(key)) { fill = hit ? '#fdba74' : '#d1d5db'; stroke = hit ? '#ea580c' : '#6b7280'; label = key === `${punch.x},${punch.y}` ? '拳头' : '拳臂'; }
    if (overlap.has(key)) { fill = '#4ade80'; stroke = '#15803d'; label = '重叠'; }
    cells += `<rect x="${px}" y="${py}" width="${cell}" height="${cell}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    if (label) cells += `<text x="${px + cell / 2}" y="${py + cell / 2 + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">${label}</text>`;
  }
  const xLabels = cols.map((x, i) => `<text x="${ox + i * cell + cell / 2}" y="536" text-anchor="middle" font-size="14" fill="#334155">x=${x}</text>`).join('');
  const yLabels = rows.map((y, i) => `<text x="78" y="${oy + i * cell + cell / 2 + 5}" text-anchor="end" font-size="14" fill="#334155">y=${y}</text>`).join('');
  const axisHints = '<text x="520" y="536" font-size="16" font-weight="700" fill="#2563eb">x →</text><text x="55" y="88" font-size="16" font-weight="700" fill="#2563eb">y ↑</text><circle cx="90" cy="514" r="4" fill="#2563eb"/><text x="82" y="554" text-anchor="end" font-size="13" font-weight="700" fill="#2563eb">原点</text>';
  const status = result ? `<rect x="90" y="570" width="414" height="52" rx="12" fill="${result === 'hit' ? '#dcfce7' : '#fee2e2'}"/><text x="297" y="603" text-anchor="middle" font-size="20" font-weight="800" fill="${result === 'hit' ? '#166534' : '#991b1b'}">${result === 'hit' ? '✓ 打中：拳臂与身体有重叠' : '✗ 没打中：没有重叠格'}</text>` : '';
  const note = blank ? '<text x="297" y="603" text-anchor="middle" font-size="18" fill="#64748b">请在题目坐标处标出拳头 P</text>' : overview ? '<text x="297" y="603" text-anchor="middle" font-size="17" fill="#475569">蓝色 2×2 区域是身体占用的 4 格</text>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="650" viewBox="0 0 680 650"><rect width="100%" height="100%" rx="20" fill="#f8fafc"/><text x="340" y="30" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif" font-size="24" font-weight="800" fill="#0f172a">${esc(title)}</text><text x="340" y="62" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif" font-size="15" fill="#64748b">${esc(subtitle || '')}</text><g font-family="-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif">${xLabels}${yLabels}${axisHints}${cells}${status}${note}</g><g font-family="-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif" font-size="14"><rect x="530" y="100" width="18" height="18" rx="3" fill="#60a5fa"/><text x="557" y="114" fill="#334155">身体</text><rect x="530" y="130" width="18" height="18" rx="3" fill="#fdba74"/><text x="557" y="144" fill="#334155">拳臂</text><rect x="530" y="160" width="18" height="18" rx="3" fill="#4ade80"/><text x="557" y="174" fill="#334155">重叠格</text></g></svg>`;
}

const files = {
  'coordinate-body.svg': diagram({title: '坐标棋盘与身体位置', subtitle: 'x 从左向右增大，y 从下向上增大', overview: true}),
  'blank-grid.svg': diagram({title: '练习用坐标棋盘', subtitle: '身体固定占 (5,3)、(6,3)、(5,4)、(6,4)', blank: true}),
  'q1-hit.svg': diagram({title: '第 1 题：(6,5)', subtitle: '拳臂从 y=5 向下延伸 3 格', punch: {x: 6, y: 5}, showArm: true, result: 'hit'}),
  'q2-miss-side.svg': diagram({title: '第 2 题：(8,6)', subtitle: '纵向够得着，但横向没有对准', punch: {x: 8, y: 6}, showArm: true, result: 'miss'}),
  'q3-miss-far.svg': diagram({title: '第 3 题：(6,8)', subtitle: '横向对准了，但拳臂还够不到身体', punch: {x: 6, y: 8}, showArm: true, result: 'miss'}),
  'q4-hit.svg': diagram({title: '第 4 题：(5,6)', subtitle: '拳臂末端刚好碰到身体左上格', punch: {x: 5, y: 6}, showArm: true, result: 'hit'}),
  'q5-miss-edge.svg': diagram({title: '第 5 题：(7,5)', subtitle: '只差一列，但仍然没有重叠', punch: {x: 7, y: 5}, showArm: true, result: 'miss'})
};
for (const [name, svg] of Object.entries(files)) fs.writeFileSync(path.join(out, name), svg);
console.log(`generated ${Object.keys(files).length} SVG diagrams`);
