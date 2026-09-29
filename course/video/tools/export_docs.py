#!/usr/bin/env python3
"""把视频时间轴导出为便于审阅的 Markdown 脚本与分镜。"""

import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "src/lesson-timeline.json").read_text(encoding="utf-8"))


def clock(seconds):
    return f"{int(seconds // 60):02}:{seconds % 60:04.1f}"


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
    f"规格：1920×1080，30 fps；主课 {clock(data['mainDuration'])}，开场保留 35 秒。旁白为 Edge TTS `{data['voice']}`（语速 `{data['rate']}`），解说配轻快电子背景音乐；结尾拼接当前独立歌曲视频。",
    "",
    "## 逐段脚本",
    "",
]
for scene in data["scenes"]:
    begin = clock(scene["start"])
    end = clock(scene["start"] + scene["duration"])
    visual = visuals.get(scene["id"], "展示拳头起点，倒计时三秒；之后逐格延伸拳臂并揭晓答案。")
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
    "## 歌曲复习",
    "",
    "结尾直接接入 [`out/boxing-rap.mp4`](./out/boxing-rap.mp4)，歌词见[新版歌曲歌词](./新版歌曲歌词.md)。",
    "",
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
