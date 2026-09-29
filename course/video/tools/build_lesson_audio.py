#!/usr/bin/env python3
"""用 Edge TTS 的实际语音时长生成紧凑教学时间轴、字幕和原创背景音乐。"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import re
import subprocess
import wave
from pathlib import Path

import edge_tts
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
CACHE = OUT / "lesson-tts"
PUBLIC_AUDIO = ROOT / "public/audio"
CONTENT = json.loads((ROOT / "src/content.json").read_text(encoding="utf-8"))
FPS = 30
RATE = 48_000
VOICE = "zh-CN-YunjianNeural"
VOICE_RATE = "+10%"
BOUNDARY = "WordBoundary"
INTRO_FRAMES = 35 * FPS


def run(*args: str, capture: bool = False) -> bytes:
    result = subprocess.run(args, check=True, stdout=subprocess.PIPE if capture else subprocess.DEVNULL)
    return result.stdout if capture else b""


def seconds_to_frames(seconds: float) -> int:
    return math.ceil(seconds * FPS - 1e-6)


def probe_duration(path: Path) -> float:
    raw = run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path), capture=True)
    return float(raw.strip())


def decode_mono(path: Path) -> np.ndarray:
    raw = run("ffmpeg", "-v", "error", "-i", str(path), "-ar", str(RATE), "-ac", "1", "-f", "f32le", "-", capture=True)
    return np.frombuffer(raw, dtype="<f4").copy()


def write_wav(path: Path, samples: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(RATE)
        writer.writeframes((np.clip(samples, -0.98, 0.98) * 32767).astype("<i2").tobytes())


def digest(scene: dict) -> str:
    value = f"{VOICE}|{VOICE_RATE}|{BOUNDARY}|{scene['voice']}"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


async def synthesize(scene: dict) -> tuple[Path, dict]:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{scene['id']}.mp3"
    meta_path = CACHE / f"{scene['id']}.json"
    key = digest(scene)
    if path.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta.get("digest") == key and meta.get("boundaries"):
            return path, meta

    last_error: Exception | None = None
    for attempt in range(3):
        audio = bytearray()
        boundaries = []
        try:
            communicate = edge_tts.Communicate(scene["voice"], VOICE, rate=VOICE_RATE, boundary=BOUNDARY)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio.extend(chunk["data"])
                elif chunk["type"] == BOUNDARY:
                    boundaries.append({
                        "start": chunk["offset"] / 10_000_000,
                        "end": (chunk["offset"] + chunk["duration"]) / 10_000_000,
                        "text": chunk["text"].strip(),
                    })
            if not audio or not boundaries:
                raise RuntimeError(f"{scene['id']} 的语音或时间信息为空")
            tmp = path.with_suffix(".part")
            tmp.write_bytes(audio)
            tmp.replace(path)
            meta = {"digest": key, "voice": VOICE, "rate": VOICE_RATE, "boundaries": boundaries, "duration": probe_duration(path)}
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            return path, meta
        except Exception as error:
            last_error = error
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    raise RuntimeError(f"Edge TTS 生成 {scene['id']} 失败，已停止制作：{last_error}") from last_error


def add(track: np.ndarray, sound: np.ndarray, second: float, gain: float = 1.0) -> None:
    offset = round(second * RATE)
    length = min(len(sound), len(track) - offset)
    if length > 0:
        track[offset:offset + length] += sound[:length] * gain


def electronic_bgm(seconds: float) -> np.ndarray:
    count = round(seconds * RATE)
    track = np.zeros(count, dtype=np.float32)
    bpm = 104
    beat = 60 / bpm
    bar = beat * 4
    chords = [
        (130.81, [261.63, 329.63, 392.00]),
        (110.00, [220.00, 261.63, 329.63]),
        (87.31, [174.61, 220.00, 261.63]),
        (98.00, [196.00, 246.94, 293.66]),
    ]
    rng = np.random.default_rng(2026)
    for bar_index in range(math.ceil(seconds / bar)):
        base = bar_index * bar
        root, notes = chords[bar_index % len(chords)]
        length = min(bar, seconds - base)
        if length <= 0:
            break
        t = np.arange(round(length * RATE), dtype=np.float32) / RATE
        envelope = np.minimum(1, t / 0.3) * np.minimum(1, (length - t) / 0.4)
        pad = sum(np.sin(2 * np.pi * note * t) for note in notes) / 3
        add(track, (0.018 * pad * envelope).astype(np.float32), base)
        for eighth in range(8):
            at = base + eighth * beat / 2
            if at >= seconds:
                break
            u = np.arange(round(0.32 * RATE), dtype=np.float32) / RATE
            note = notes[[0, 1, 2, 1, 0, 2, 1, 2][eighth]] * 2
            pluck = (np.sin(2 * np.pi * note * u) + 0.2 * np.sin(4 * np.pi * note * u)) * np.exp(-13 * u)
            add(track, pluck.astype(np.float32), at, 0.025)
            hat_time = np.arange(round(0.06 * RATE), dtype=np.float32) / RATE
            hat = rng.standard_normal(len(hat_time)).astype(np.float32) * np.exp(-85 * hat_time)
            add(track, hat, at, 0.0035)
        for beat_index in range(4):
            at = base + beat_index * beat
            if at >= seconds:
                break
            u = np.arange(round(0.25 * RATE), dtype=np.float32) / RATE
            bass = np.sin(2 * np.pi * root * u) * np.exp(-13 * u)
            add(track, bass.astype(np.float32), at, 0.022 if beat_index in (0, 2) else 0.012)
    # 轻量母带音量。旁白时再自动下压，开头与结尾淡入淡出。
    rms = float(np.sqrt(np.mean(track * track))) or 1
    track *= 0.020 / rms
    fade_in = min(count, RATE)
    fade_out = min(count, round(0.7 * RATE))
    track[:fade_in] *= np.linspace(0, 1, fade_in)
    track[-fade_out:] *= np.linspace(1, 0, fade_out)
    return track


def effect(hit: bool) -> np.ndarray:
    t = np.arange(round(0.32 * RATE), dtype=np.float32) / RATE
    if hit:
        return (0.10 * np.sin(2 * np.pi * (660 - 420 * t) * t) * np.exp(-13 * t)).astype(np.float32)
    rng = np.random.default_rng(55)
    return (0.025 * rng.standard_normal(len(t)) * np.exp(-19 * t)).astype(np.float32)


def stamp(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def write_srt(path: Path, captions: list[dict]) -> None:
    rows = [f"{i}\n{stamp(item['start'])} --> {stamp(item['end'])}\n{item['text']}" for i, item in enumerate(captions, 1)]
    path.write_text("\n\n".join(rows) + "\n", encoding="utf-8")


def captions_from_words(text: str, boundaries: list[dict], voice_start: float, duration: float) -> list[dict]:
    """用原稿标点分组，利用实际字词时间边界安排短字幕。"""
    clean = lambda value: re.sub(r"[\s，。！？；：、]", "", value)
    source_parts = re.findall(r"[^，。！？；：]+[，。！？；：]?", text)
    if clean(text) != "".join(clean(word["text"]) for word in boundaries):
        raise RuntimeError(f"Edge TTS 字词与原稿不一致，不能生成可靠字幕：{text}")
    rows = []
    cursor = 0
    for part in source_parts:
        target = len(clean(part))
        if not target:
            continue
        first = cursor
        consumed = 0
        while cursor < len(boundaries) and consumed < target:
            consumed += len(clean(boundaries[cursor]["text"]))
            cursor += 1
        if consumed != target:
            raise RuntimeError(f"字幕分句未落在字词边界：{part}")
        start = voice_start + boundaries[first]["start"]
        end = voice_start + boundaries[cursor - 1]["end"]
        if cursor < len(boundaries):
            end = max(end, voice_start + boundaries[cursor]["start"] - 0.02)
        rows.append({"start": round(start, 3), "end": round(min(end, duration), 3), "text": part.strip()})
    return rows


async def main() -> None:
    OUT.mkdir(exist_ok=True)
    PUBLIC_AUDIO.mkdir(parents=True, exist_ok=True)
    spoken = []
    for scene in CONTENT["scenes"]:
        print(f"Edge TTS：{scene['id']}", flush=True)
        path, meta = await synthesize(scene)
        spoken.append((scene, path, meta))

    scenes = []
    cursor = INTRO_FRAMES
    for index, (source, path, meta) in enumerate(spoken):
        audio_duration = meta["duration"]
        if index == 0:
            start_frame, duration_frames, voice_local = 0, 18 * FPS, 0.8
        elif index == 1:
            start_frame, duration_frames, voice_local = 18 * FPS, 17 * FPS, 0.8
        else:
            start_frame = cursor
            if source["type"] == "quiz":
                voice_local = 4.05
                duration_frames = seconds_to_frames(voice_local + audio_duration + 0.05)
            else:
                voice_local = 0
                duration_frames = seconds_to_frames(audio_duration + 0.08)
            cursor += duration_frames
        if voice_local + audio_duration > duration_frames / FPS + 0.001:
            raise RuntimeError(f"{source['id']} 的配音超过场景时长")
        item = {key: value for key, value in source.items() if key not in ("start", "duration", "voiceAt")}
        item.update({
            "start": start_frame / FPS,
            "duration": duration_frames / FPS,
            "voiceStart": (start_frame / FPS) + voice_local,
            "voiceDuration": audio_duration,
        })
        if source["type"] == "quiz":
            item.update({"revealAt": 3.0, "resultAt": 4.0})
        elif source["type"] in ("arm", "example", "rule"):
            item["revealAt"] = max(0.5, audio_duration - 2.2)
            if source["type"] == "example":
                item["resultAt"] = item["revealAt"] + 1.0
        scenes.append(item)

    main_duration = cursor / FPS
    voice_track = np.zeros(round(main_duration * RATE), dtype=np.float32)
    captions = []
    for scene, (_, path, meta) in zip(scenes, spoken):
        add(voice_track, decode_mono(path), scene["voiceStart"])
        captions.extend(captions_from_words(scene["voice"], meta["boundaries"], scene["voiceStart"], main_duration))
    music = electronic_bgm(main_duration)
    # 旁白活跃处将音乐压低约 6 dB，给数字和坐标留出空间。
    window = max(1, round(0.08 * RATE))
    active = np.abs(voice_track[:len(voice_track) // window * window].reshape(-1, window)).mean(axis=1) > 0.005
    duck = np.repeat(np.where(active, 0.48, 1.0), window)
    if len(duck) < len(music):
        duck = np.pad(duck, (0, len(music) - len(duck)), constant_values=1)
    smoothing = 3000
    padded = np.pad(duck.astype(np.float32), (smoothing // 2, smoothing // 2), mode="edge")
    cumulative = np.cumsum(np.concatenate(([0], padded)), dtype=np.float64)
    duck = ((cumulative[smoothing:] - cumulative[:-smoothing]) / smoothing)[:len(music)]
    music *= duck[:len(music)]
    mixed = voice_track + music
    for scene in scenes:
        if scene["type"] == "quiz":
            add(mixed, effect(scene["result"] == "hit"), scene["start"] + scene["resultAt"])
    peak = float(np.max(np.abs(mixed)))
    if peak > 0.89:
        mixed *= 0.89 / peak
    write_wav(PUBLIC_AUDIO / "lesson-main-new.wav", mixed)
    write_wav(OUT / "lesson-bgm.wav", music)
    write_srt(OUT / "lesson-main.srt", captions)
    timeline = {"fps": FPS, "mainFrames": cursor, "mainDuration": main_duration, "voice": VOICE, "rate": VOICE_RATE, "scenes": scenes}
    (ROOT / "src/lesson-timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "src/lesson-captions.json").write_text(json.dumps(captions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"主课 {main_duration:.3f} 秒；字幕 {len(captions)} 条；背景音乐已混入。")


if __name__ == "__main__":
    asyncio.run(main())
