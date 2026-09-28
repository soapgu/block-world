// 从现有 v1 原型捕捉真实游戏画面，不修改游戏代码。
import {spawn, execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve, dirname} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const game = resolve(root, '../../prototype/boxer/v1/index.html');
const frames = resolve(root, 'out/game-frames');
const output = resolve(root, 'public/video/gameplay.mp4');
const browser = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9237;
const profile = `/private/tmp/boxing-course-cdp-${process.pid}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(frames, {recursive: true});
mkdirSync(dirname(output), {recursive: true});

const chrome = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--disable-background-networking', '--disable-crash-reporter',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=480,680', pathToFileURL(game).href,
], {stdio: 'ignore'});

let socket;
try {
  let tabs;
  for (let i = 0; i < 80; i++) {
    try {
      tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (tabs.some((t) => t.type === 'page')) break;
    } catch {}
    await sleep(250);
  }
  const tab = tabs?.find((t) => t.type === 'page');
  if (!tab) throw new Error('Chrome CDP 未启动');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolveReady, reject) => {
    socket.addEventListener('open', resolveReady, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const callback = pending.get(message.id);
    if (callback) {
      pending.delete(message.id);
      message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolveRequest, reject) => {
    const id = nextId++;
    pending.set(id, {resolve: resolveRequest, reject});
    socket.send(JSON.stringify({id, method, params}));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 480, height: 680, deviceScaleFactor: 1, mobile: false});
  await sleep(1000);
  await send('Runtime.evaluate', {expression: "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));"});
  const start = Date.now();
  for (let i = 0; i < 120; i++) {
    if (i === 24) await send('Runtime.evaluate', {expression: "window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp',bubbles:true}));"});
    if (i > 20 && i % 20 === 0) await send('Runtime.evaluate', {expression: "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));"});
    if (i >= 20 && i % 7 === 0) await send('Runtime.evaluate', {expression: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'${i % 2 ? 'a' : 'd'}',bubbles:true}));`});
    const shot = await send('Page.captureScreenshot', {format: 'jpeg', quality: 78, captureBeyondViewport: false});
    writeFileSync(resolve(frames, `frame-${String(i).padStart(4, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
    const wait = start + (i + 1) * 100 - Date.now();
    if (wait > 0) await sleep(wait);
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '10', '-i', resolve(frames, 'frame-%04d.jpg'), '-vf', 'fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', output]);
  console.log(`已录制 12 秒游戏片段：${output}`);
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await Promise.race([new Promise((resolveExit) => chrome.once('exit', resolveExit)), sleep(2000)]);
  rmSync(frames, {recursive: true, force: true});
  rmSync(profile, {recursive: true, force: true});
}
