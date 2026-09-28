#!/usr/bin/env python3
"""把视频时间轴导出为便于审阅的 Markdown 脚本与分镜。"""

import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "src/content.json").read_text(encoding="utf-8"))


def clock(seconds):
    return f"{int(seconds // 60):02}:{int(seconds % 60):02}"


visuals = {
    "hook": "游戏实录与主标题；呈现命中、打空疑问。",
    "game": "展示现有 v1 原型游戏实录和操作提示。",
    "coordinates": "九乘九棋盘出现；标出原点、x 与 y 方向。",
    "body": "蓝色身体四格依次点亮。",
    "arm": "从 (6,5) 向下逐格延伸橙色拳臂。",
    "hit": "(6,5) 的拳臂与身体重叠，重叠格变绿。",
    "miss-x": "(8,6) 的拳臂从身体右侧经过。",
    "miss-y": "(6,8) 的拳臂停在身体上方。",
    "rule": "并列展示横坐标和纵坐标的固定场景判断条件。",
    "quiz-intro": "展示三步判断方法。",
    "summary": "身体和拳臂区域同时高亮，提示通用的重叠规则。",
}

lines = [
    "# 拳击编程课：教学版脚本与分镜",
    "",
    "规格：1920×1080，30 fps，普通话；主课 5 分钟，结尾接 83 秒说唱复习。",
    "",
    "## 逐段脚本",
    "",
]
for scene in data["scenes"]:
    begin = clock(scene["start"])
    end = clock(scene["start"] + scene["duration"])
    visual = visuals.get(scene["id"], "先展示拳头起点与倒计时；六秒后逐格延伸拳臂并揭晓答案。")
    screen = scene["screen"].replace("\n", "；")
    lines += [
        f"### {begin}–{end}｜{scene['title']}",
        "",
        f"- 画面：{visual}",
        f"- 屏幕文字：{screen}",
        f"- 旁白：{scene['voice']}",
        "",
    ]

lines += [
    "## 说唱版歌词与节奏",
    "",
    "原创节拍：92 BPM、4/4 拍；每行一小节，每小节约 2.609 秒。蓝色身体、橙色拳臂、绿色重叠格随歌词变化。",
    "",
    "| 小节 | 时间 | 歌词 |",
    "|---:|---|---|",
]
bar = 4 * 60 / data["rapBpm"]
for i, lyric in enumerate(data["rapLines"]):
    start, end = i * bar, (i + 1) * bar
    lines.append(f"| {i + 1} | {clock(start)}–{clock(end)} | {lyric} |")
lines += [
    "",
    "## 内容核对",
    "",
    "- 身体四格：`(5,3)、(6,3)、(5,4)、(6,4)`。",
    "- 拳臂：从起点向下延伸三格，连同起点占四格。",
    "- 五题答案：`(6,5)` 打中，`(8,6)` 打空，`(6,8)` 打空，`(5,6)` 打中，`(7,5)` 打空。",
    "- 起点位于身体上方时，正确的固定场景条件是 `5 ≤ x ≤ 6` 且 `5 ≤ y ≤ 7`；原讲义漏掉了 y=7。",
    "- 通用原理是两片区域是否重叠。",
    "",
]
(root / "脚本与分镜.md").write_text("\n".join(lines), encoding="utf-8")
