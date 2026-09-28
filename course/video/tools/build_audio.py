#!/usr/bin/env python3
"""用 macOS 中文语音和原创合成节拍生成两支视频的声音与字幕。"""

from __future__ import annotations

import json
import math
import re
import subprocess
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
CONTENT = json.loads((ROOT / "src/content.json").read_text(encoding="utf-8"))
PUBLIC_AUDIO = ROOT / "public/audio"
OUT = ROOT / "out"
TEMP = OUT / "tts-temp"
CAPTION_PATH = ROOT / "src/generated-captions.json"
RATE = 44_100
BPM = CONTENT["rapBpm"]
BAR = 4 * 60 / BPM
RAP_DURATION = CONTENT["rapBars"] * BAR
MAIN_DURATION = CONTENT["lessonMainSeconds"]


def run(*args: str) -> None:
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)


def speak(text: str, name: str, voice: str, words_per_minute: int) -> np.ndarray:
    aiff = TEMP / f"{name}.aiff"
    wav = TEMP / f"{name}.wav"
    run("say", "-v", voice, "-r", str(words_per_minute), "-o", str(aiff), text)
    run("ffmpeg", "-y", "-v", "error", "-i", str(aiff), "-ar", str(RATE), "-ac", "1", "-c:a", "pcm_s16le", str(wav))
    with wave.open(str(wav)) as reader:
        data = np.frombuffer(reader.readframes(reader.getnframes()), dtype="<i2").astype(np.float32) / 32768
    # 去掉系统语音在首尾留下的大段静音。
    active = np.flatnonzero(np.abs(data) > 0.006)
    if active.size:
        data = data[max(0, active[0] - int(0.05 * RATE)):min(len(data), active[-1] + int(0.12 * RATE))]
    return data


def fit_audio(samples: np.ndarray, max_seconds: float, name: str) -> np.ndarray:
    if len(samples) / RATE <= max_seconds:
        return samples
    input_wav = TEMP / f"{name}-fit-in.wav"
    output_wav = TEMP / f"{name}-fit-out.wav"
    save_wav(input_wav, samples)
    factor = len(samples) / RATE / max_seconds
    run("ffmpeg", "-y", "-v", "error", "-i", str(input_wav), "-af", f"atempo={factor:.5f}", "-ar", str(RATE), "-ac", "1", str(output_wav))
    with wave.open(str(output_wav)) as reader:
        return np.frombuffer(reader.readframes(reader.getnframes()), dtype="<i2").astype(np.float32) / 32768


def add(track: np.ndarray, samples: np.ndarray, start: float, gain: float = 1) -> None:
    offset = round(start * RATE)
    if offset >= len(track):
        return
    count = min(len(samples), len(track) - offset)
    if count:
        fade = min(int(0.018 * RATE), count // 4)
        wave_data = samples[:count].copy()
        if fade:
            wave_data[:fade] *= np.linspace(0, 1, fade)
            wave_data[-fade:] *= np.linspace(1, 0, fade)
        track[offset:offset + count] += wave_data * gain


def save_wav(path: Path, data: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(data, -0.98, 0.98)
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(RATE)
        writer.writeframes((pcm * 32767).astype("<i2").tobytes())


def timecode(t: float) -> str:
    millis = round(t * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    seconds, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"


def write_srt(path: Path, entries: list[dict]) -> None:
    rows = []
    for index, item in enumerate(entries, 1):
        rows.append(f"{index}\n{timecode(item['start'])} --> {timecode(item['end'])}\n{item['text']}\n")
    path.write_text("\n".join(rows), encoding="utf-8")


def split_caption(text: str, start: float, duration: float) -> list[dict]:
    pieces = [s.strip() for s in re.split(r"(?<=[，。！？；])", text) if s.strip()]
    total = sum(len(s) for s in pieces)
    cursor = start
    captions = []
    for i, piece in enumerate(pieces):
        end = start + duration if i == len(pieces) - 1 else cursor + duration * len(piece) / total
        captions.append({"start": round(cursor, 3), "end": round(end, 3), "text": piece})
        cursor = end
    return captions


def make_pad(seconds: float) -> np.ndarray:
    # 原创轻音乐底色，教学段只作低音量衬托。
    track = np.zeros(round(seconds * RATE), np.float32)
    chord = [220.0, 261.63, 293.66, 246.94]
    for bar in range(math.ceil(seconds / 4)):
        start = bar * 4
        length = min(4, seconds - start)
        if length <= 0:
            break
        t = np.arange(round(length * RATE), dtype=np.float32) / RATE
        envelope = np.minimum(1, t / 0.6) * np.minimum(1, (length - t) / 0.8)
        tone = (np.sin(2 * np.pi * chord[bar % 4] * t) + 0.35 * np.sin(2 * np.pi * chord[bar % 4] * 1.5 * t))
        add(track, (tone * envelope * 0.035).astype(np.float32), start)
    return track


def hit_effect() -> np.ndarray:
    t = np.arange(round(0.4 * RATE), dtype=np.float32) / RATE
    return (0.12 * np.sin(2 * np.pi * (660 - 500 * t) * t) * np.exp(-12 * t)).astype(np.float32)


def miss_effect() -> np.ndarray:
    rng = np.random.default_rng(55)
    t = np.arange(round(0.32 * RATE), dtype=np.float32) / RATE
    return (0.035 * rng.standard_normal(len(t)) * np.exp(-18 * t)).astype(np.float32)


def make_lesson() -> list[dict]:
    track = make_pad(MAIN_DURATION)
    captions: list[dict] = []
    for scene in CONTENT["scenes"]:
        voice_at = scene.get("voiceAt", 0)
        start = scene["start"] + voice_at + (0.5 if scene["type"] == "quiz" else 1.2)
        available = scene["start"] + scene["duration"] - start - 0.7
        speech = speak(scene["voice"], scene["id"], "Tingting", 190)
        speech = fit_audio(speech, available, scene["id"])
        add(track, speech, start, 0.86)
        captions.extend(split_caption(scene["voice"], start, min(len(speech) / RATE, available)))
        if scene["type"] == "quiz":
            add(track, hit_effect() if scene["result"] == "hit" else miss_effect(), scene["start"] + 6.2, 1)
        elif scene["id"] == "hit":
            add(track, hit_effect(), scene["start"] + 11, 1)
    save_wav(PUBLIC_AUDIO / "lesson-main.wav", track)
    return captions


def drum_hit(frequency: float, length: float, decay: float, gain: float) -> np.ndarray:
    t = np.arange(round(length * RATE), dtype=np.float32) / RATE
    pitch = frequency * np.exp(-15 * t) + frequency * 0.5
    phase = 2 * np.pi * np.cumsum(pitch) / RATE
    return (gain * np.sin(phase) * np.exp(-decay * t)).astype(np.float32)


def make_beat() -> np.ndarray:
    track = np.zeros(round(RAP_DURATION * RATE), np.float32)
    kick = drum_hit(160, 0.42, 13, 0.30)
    rng = np.random.default_rng(92)
    snare_time = np.arange(round(0.22 * RATE), dtype=np.float32) / RATE
    snare = (rng.standard_normal(len(snare_time)) * np.exp(-25 * snare_time) * 0.11).astype(np.float32)
    hat_time = np.arange(round(0.08 * RATE), dtype=np.float32) / RATE
    hat = (rng.standard_normal(len(hat_time)) * np.exp(-65 * hat_time) * 0.026).astype(np.float32)
    beat_length = 60 / BPM
    roots = [110, 98, 130.81, 87.31]
    for bar_index in range(CONTENT["rapBars"]):
        base = bar_index * BAR
        for beat in range(4):
            at = base + beat * beat_length
            add(track, kick if beat in (0, 2) else snare, at)
            add(track, hat, at)
            add(track, hat, at + beat_length / 2, 0.75)
        # 每小节一个轻量低音型，给朗读人声留下空间。
        t = np.arange(round(0.5 * RATE), dtype=np.float32) / RATE
        bass = (0.075 * np.sin(2 * np.pi * roots[(bar_index // 4) % 4] * t) * np.exp(-5 * t)).astype(np.float32)
        add(track, bass, base)
        add(track, bass, base + 2 * beat_length, 0.7)
    return track


def make_rap() -> list[dict]:
    track = make_beat()
    captions: list[dict] = []
    for i, line in enumerate(CONTENT["rapLines"]):
        start = i * BAR + 0.14
        speech = speak(line, f"rap-{i + 1:02}", "Eddy (中文（中国大陆）)", 235)
        speech = fit_audio(speech, BAR - 0.35, f"rap-{i + 1:02}")
        add(track, speech, start, 0.74)
        captions.append({"start": round(i * BAR, 3), "end": round((i + 1) * BAR, 3), "text": line})
    save_wav(PUBLIC_AUDIO / "rap.wav", track)
    return captions


def main() -> None:
    PUBLIC_AUDIO.mkdir(parents=True, exist_ok=True)
    TEMP.mkdir(parents=True, exist_ok=True)
    lesson_captions = make_lesson()
    rap_captions = make_rap()
    write_srt(OUT / "教学版.srt", lesson_captions + [dict(item, start=item["start"] + MAIN_DURATION, end=item["end"] + MAIN_DURATION) for item in rap_captions])
    write_srt(OUT / "说唱版.srt", rap_captions)
    CAPTION_PATH.write_text(json.dumps({"lesson": lesson_captions, "rap": rap_captions}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"教学旁白 {MAIN_DURATION}s；说唱 {RAP_DURATION:.2f}s；字幕已生成。")


if __name__ == "__main__":
    main()
