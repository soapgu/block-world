# 拳击编程课视频工程

本目录用 Remotion 制作教学版和说唱版。内容时间轴与原创歌词保存在 `src/content.json`；`脚本与分镜.md` 由该数据导出。说唱版采用原创合成节拍与普通话系统语音的逐小节节奏朗读。画面不修改原有游戏或讲义。

## 本机复现

需要 macOS、Chrome、Node.js、Python 3、NumPy、FFmpeg，以及可用的中文系统语音 Tingting 和 Eddy。

```bash
cd course/video
npm install
python3 tools/export_docs.py
python3 tools/build_audio.py
node tools/capture_game.mjs
npm run render:rap -- --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
npm run render:lesson -- --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

生成的 `out/boxing-lesson.mp4` 包含主课和完整说唱，`out/boxing-rap.mp4` 是独立说唱版；`out/教学版.srt`、`out/说唱版.srt` 是外挂字幕。`public/audio/`、`public/video/` 和 `out/` 为生成产物，未纳入 Git。

## 内容检查

身体固定在 `(5,3)、(6,3)、(5,4)、(6,4)`；拳臂从起点向下再伸三格。五道题的结果依次为：打中、打空、打空、打中、打空。起点位于身体上方时，正确的快速判断是 `5 ≤ x ≤ 6` 且 `5 ≤ y ≤ 7`，原讲义漏掉了 y=7，见 [讲义勘误](讲义勘误.md)。视频最后说明通用做法是检查区域重叠。
