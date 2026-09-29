# 拳击编程课视频工程

本目录用 Remotion 制作教学主课和独立歌曲版。教学旁白使用 Edge TTS `zh-CN-YunjianNeural`，场景与字幕根据生成音频的实际时长排布；教学版结尾拼接 `out/boxing-rap.mp4`。画面不修改原有游戏或讲义。

## 本机复现

需要 macOS、Chrome、Node.js、Python 3 和 FFmpeg。Edge TTS 为在线语音服务，生成旁白时需要网络连接。

```bash
cd course/video
npm install
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-audio.txt
node tools/capture_game.mjs
npm run render:lesson
python3 tools/export_docs.py
```

先确认或生成最新的 `out/boxing-rap.mp4` 和 `out/说唱版.srt`，再运行 `npm run render:lesson`；仅在需要重做独立歌曲时才运行 `npm run render:rap`。教学渲染脚本会生成动态时间轴、旁白及背景音乐，单独渲染主课，再拼接现有歌曲。`out/boxing-lesson.mp4` 为完整教学版，`out/教学版.srt` 为外挂字幕。`public/audio/`、`public/video/`、`.venv/` 和 `out/` 为本地产物，未纳入 Git。旧的 `tools/build_audio.py` 会生成旧说唱，重制教学版时不要运行。

## 内容检查

身体固定在 `(5,3)、(6,3)、(5,4)、(6,4)`；拳臂从起点向下再伸三格。五道题的结果依次为：打中、打空、打空、打中、打空。起点位于身体上方时，正确的快速判断是 `5 ≤ x ≤ 6` 且 `5 ≤ y ≤ 7`，原讲义漏掉了 y=7，见 [讲义勘误](讲义勘误.md)。视频最后说明通用做法是检查区域重叠。
