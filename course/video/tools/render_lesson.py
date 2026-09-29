#!/usr/bin/env python3
"""重制教学主课，并在片尾接入当前独立歌曲 MP4。"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
SONG = OUT / "boxing-rap.mp4"
MAIN = OUT / "lesson-main-new.mp4"
FINAL = OUT / "boxing-lesson.mp4"
TEMP = OUT / "boxing-lesson-new.tmp.mp4"
MAIN_SRT = OUT / "lesson-main.srt"
SONG_SRT = OUT / "说唱版.srt"
FINAL_SRT = OUT / "教学版.srt"


def run(args: list[str], *, capture: bool = False) -> str:
    result = subprocess.run(args, cwd=ROOT, check=True, text=True, stdout=subprocess.PIPE if capture else None)
    return result.stdout if capture else ""


def checksum(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as reader:
        for chunk in iter(lambda: reader.read(1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest()


def probe(path: Path) -> dict:
    return json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,duration", "-of", "json", str(path)], capture=True))


def audio_video(info: dict) -> tuple[dict, dict]:
    video = next((x for x in info["streams"] if x["codec_type"] == "video"), None)
    audio = next((x for x in info["streams"] if x["codec_type"] == "audio"), None)
    if video is None or audio is None:
        raise RuntimeError("视频必须同时包含画面和音轨")
    if (video["width"], video["height"], video["r_frame_rate"]) != (1920, 1080, "30/1"):
        raise RuntimeError("歌曲视频必须为 1920×1080、30 fps")
    return video, audio


def parse_stamp(stamp: str) -> int:
    hours, minutes, rest = stamp.split(":")
    seconds, millis = rest.split(",")
    return ((int(hours) * 60 + int(minutes)) * 60 + int(seconds)) * 1000 + int(millis)


def format_stamp(total: int) -> str:
    hours, total = divmod(total, 3_600_000)
    minutes, total = divmod(total, 60_000)
    seconds, millis = divmod(total, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"


def read_srt(path: Path) -> list[tuple[int, int, str]]:
    cues = []
    for block in re.split(r"\n\s*\n", path.read_text(encoding="utf-8").strip()):
        lines = block.splitlines()
        match = re.fullmatch(r"(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})", lines[1])
        if not match:
            raise ValueError(f"字幕格式无效：{path.name} 第 {len(cues) + 1} 条")
        cues.append((parse_stamp(match.group(1)), parse_stamp(match.group(2)), "\n".join(lines[2:])))
    return cues


def write_combined_srt(main_duration: float, song_duration: float) -> int:
    main = read_srt(MAIN_SRT)
    song = read_srt(SONG_SRT)
    if not song or song[-1][1] > round(song_duration * 1000) + 150:
        raise RuntimeError("歌曲字幕缺失或超出歌曲时长")
    shift = round(main_duration * 1000)
    combined = main + [(start + shift, end + shift, text) for start, end, text in song]
    if any(end <= start for start, end, _ in combined):
        raise RuntimeError("合并字幕出现空白或倒置的时间段")
    rows = [f"{i}\n{format_stamp(start)} --> {format_stamp(end)}\n{text}" for i, (start, end, text) in enumerate(combined, 1)]
    temp = FINAL_SRT.with_suffix(".tmp")
    temp.write_text("\n\n".join(rows) + "\n", encoding="utf-8")
    temp.replace(FINAL_SRT)
    return len(combined)


def main() -> None:
    if not SONG.is_file() or not SONG_SRT.is_file():
        raise RuntimeError("当前歌曲视频或字幕不存在，无法合并教学版")
    song_hash = checksum(SONG)
    song_info = probe(SONG)
    audio_video(song_info)
    song_video = next(x for x in song_info["streams"] if x["codec_type"] == "video")
    song_video_seconds = float(song_video["duration"])
    song_frames = round(song_video_seconds * 30)

    print("生成 Edge TTS 配音、动态时间轴与背景音乐", flush=True)
    run([sys.executable, str(ROOT / "tools/build_lesson_audio.py")])
    timeline = json.loads((ROOT / "src/lesson-timeline.json").read_text(encoding="utf-8"))
    main_frames = timeline["mainFrames"]
    main_duration = main_frames / 30
    browser = os.environ.get("REMOTION_BROWSER", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

    print("渲染教学主课", flush=True)
    run([str(ROOT / "node_modules/.bin/remotion"), "render", "src/index.ts", "LessonMain", str(MAIN), "--public-dir", "public", "--codec", "h264", "--crf", "21", "--concurrency", "6", "--overwrite", f"--browser-executable={browser}", "--log=error"])
    main_info = probe(MAIN)
    audio_video(main_info)

    print("拼接当前歌曲视频", flush=True)
    graph = (
        f"[0:v]fps=30,trim=end_frame={main_frames},setpts=PTS-STARTPTS,format=yuv420p[v0];"
        f"[1:v]fps=30,trim=end_frame={song_frames},setpts=PTS-STARTPTS,format=yuv420p[v1];"
        f"[0:a]aresample=48000,atrim=duration={main_duration:.6f},asetpts=PTS-STARTPTS[a0];"
        f"[1:a]aresample=48000,atrim=duration={song_video_seconds:.6f},asetpts=PTS-STARTPTS[a1];"
        "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]"
    )
    run(["ffmpeg", "-y", "-v", "error", "-i", str(MAIN), "-i", str(SONG), "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", str(TEMP)])
    final_info = probe(TEMP)
    audio_video(final_info)
    expected = main_duration + song_video_seconds
    if abs(float(final_info["format"]["duration"]) - expected) > 0.12:
        raise RuntimeError("合并视频时长与两段素材不符")
    if checksum(SONG) != song_hash:
        raise RuntimeError("渲染期间歌曲文件发生变化，停止覆盖教学版")
    cue_count = write_combined_srt(main_duration, song_video_seconds)
    backup = OUT / "boxing-lesson-before-remake.mp4"
    if FINAL.exists() and not backup.exists():
        shutil.copy2(FINAL, backup)
    TEMP.replace(FINAL)
    manifest = {
        "lessonMainSeconds": main_duration,
        "songSeconds": song_video_seconds,
        "finalSeconds": float(final_info["format"]["duration"]),
        "songSha256BeforeAndAfter": song_hash,
        "finalSha256": checksum(FINAL),
        "captionCount": cue_count,
        "voice": timeline["voice"],
        "voiceRate": timeline["rate"],
        "quizCountdownSeconds": 3,
    }
    (OUT / "lesson-render-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
