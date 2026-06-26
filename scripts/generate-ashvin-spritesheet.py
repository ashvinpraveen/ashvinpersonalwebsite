from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "ai-ashvin-pet.png"
SHEET = ROOT / "public" / "ai-ashvin-spritesheet.png"
MANIFEST = ROOT / "public" / "ai-ashvin-spritesheet.json"

FRAME_W = 256
FRAME_H = 367
CHAR_W = 174
OUTLINE = (24, 22, 22, 255)
INK = (38, 34, 31, 255)
MUTED = (86, 80, 73, 255)
PAPER = (246, 240, 224, 255)
ORANGE = (235, 151, 26, 255)
BLUE = (67, 115, 160, 255)
GREEN = (78, 139, 98, 255)
RED = (194, 77, 63, 255)
SHADOW = (30, 25, 22, 60)

POSES = [
    "idle",
    "working",
    "running",
    "talk",
    "thinking",
    "journaling",
    "filmmaking",
    "laptop",
]


def load_character() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    bbox = source.getbbox()
    if bbox:
        source = source.crop(bbox)
    ratio = source.height / source.width
    return source.resize((CHAR_W, int(CHAR_W * ratio)), Image.Resampling.NEAREST)


def paste_character(frame: Image.Image, character: Image.Image, *, x_offset: int = 0, y_offset: int = 0, rotate: int = 0) -> None:
    sprite = character
    if rotate:
        sprite = character.rotate(rotate, resample=Image.Resampling.NEAREST, expand=True)
    x = (FRAME_W - sprite.width) // 2 + x_offset
    y = FRAME_H - sprite.height - 20 + y_offset
    frame.alpha_composite(sprite, (x, y))


def draw_shadow(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((76, 320, 180, 348), fill=SHADOW)


def draw_thought(draw: ImageDraw.ImageDraw) -> None:
    for box in [(156, 56, 176, 76), (178, 34, 214, 70), (207, 14, 246, 54)]:
        draw.ellipse(box, fill=PAPER, outline=OUTLINE, width=4)
    draw.rectangle((197, 32, 206, 41), fill=PAPER)


def draw_speed(draw: ImageDraw.ImageDraw) -> None:
    for y, length in [(108, 76), (142, 56), (284, 70), (306, 48)]:
        draw.line((22, y, 22 + length, y - 12), fill=ORANGE, width=5)
        draw.line((18, y + 12, 18 + length // 2, y + 4), fill=MUTED, width=4)


def draw_laptop(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((62, 240, 194, 312), radius=6, fill=(54, 58, 62, 255), outline=OUTLINE, width=5)
    draw.rectangle((76, 254, 180, 294), fill=(116, 156, 180, 255))
    draw.rectangle((50, 311, 206, 326), fill=(38, 38, 40, 255), outline=OUTLINE, width=4)
    draw.rectangle((112, 318, 144, 323), fill=(126, 126, 126, 255))


def draw_journal(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(56, 270), (125, 250), (125, 318), (58, 334)], fill=PAPER, outline=OUTLINE)
    draw.polygon([(128, 250), (199, 268), (196, 334), (128, 318)], fill=(236, 231, 212, 255), outline=OUTLINE)
    draw.line((128, 254, 127, 318), fill=OUTLINE, width=4)
    for y in [272, 288, 304]:
        draw.line((70, y, 112, y - 10), fill=MUTED, width=3)
        draw.line((144, y - 4, 184, y + 6), fill=MUTED, width=3)
    draw.line((184, 238, 210, 282), fill=ORANGE, width=6)
    draw.line((210, 282, 216, 292), fill=OUTLINE, width=5)


def draw_podium(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle((78, 248, 178, 320), fill=(82, 58, 42, 255), outline=OUTLINE, width=5)
    draw.rectangle((66, 230, 190, 256), fill=(112, 77, 49, 255), outline=OUTLINE, width=5)
    draw.line((178, 222, 156, 239), fill=OUTLINE, width=5)
    draw.ellipse((172, 210, 190, 228), fill=(40, 40, 42, 255), outline=OUTLINE, width=3)
    draw.rounded_rectangle((38, 76, 116, 122), radius=10, fill=PAPER, outline=OUTLINE, width=4)
    draw.polygon([(106, 118), (118, 138), (84, 121)], fill=PAPER, outline=OUTLINE)
    draw.line((54, 93, 100, 93), fill=ORANGE, width=4)
    draw.line((54, 108, 90, 108), fill=MUTED, width=4)


def draw_clapper(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle((142, 226, 222, 286), fill=(40, 42, 44, 255), outline=OUTLINE, width=5)
    draw.rectangle((142, 208, 222, 230), fill=PAPER, outline=OUTLINE, width=4)
    for x in [150, 176, 202]:
        draw.polygon([(x, 208), (x + 18, 208), (x + 6, 230), (x - 12, 230)], fill=INK)
    draw.circle((168, 258), 13, fill=BLUE, outline=OUTLINE, width=4)
    draw.circle((200, 256), 8, fill=(120, 150, 160, 255), outline=OUTLINE, width=3)
    draw.line((172, 286, 156, 332), fill=OUTLINE, width=5)
    draw.line((198, 286, 220, 332), fill=OUTLINE, width=5)


def draw_clipboard(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((150, 210, 220, 298), radius=5, fill=PAPER, outline=OUTLINE, width=5)
    draw.rectangle((171, 198, 199, 218), fill=MUTED, outline=OUTLINE, width=4)
    for y in [232, 250, 268]:
        draw.line((164, y, 204, y), fill=MUTED, width=3)
    draw.line((164, 287, 180, 276), fill=GREEN, width=5)
    draw.line((180, 276, 206, 292), fill=GREEN, width=5)


def compose_pose(character: Image.Image, pose: str) -> Image.Image:
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw_shadow(draw)

    if pose == "running":
        draw_speed(draw)
        paste_character(frame, character, x_offset=10, y_offset=0, rotate=-6)
        draw.line((68, 338, 108, 328), fill=OUTLINE, width=5)
        draw.line((152, 328, 192, 342), fill=OUTLINE, width=5)
    elif pose == "thinking":
        draw_thought(draw)
        paste_character(frame, character)
    elif pose == "laptop":
        paste_character(frame, character, y_offset=-4)
        draw_laptop(draw)
    elif pose == "journaling":
        paste_character(frame, character, x_offset=-10)
        draw_journal(draw)
    elif pose == "talk":
        paste_character(frame, character, y_offset=-8)
        draw_podium(draw)
    elif pose == "filmmaking":
        paste_character(frame, character, x_offset=-28)
        draw_clapper(draw)
    elif pose == "working":
        paste_character(frame, character, x_offset=-20)
        draw_clipboard(draw)
    else:
        paste_character(frame, character)

    return frame


def main() -> None:
    character = load_character()
    frames = [compose_pose(character, pose) for pose in POSES]
    sheet = Image.new("RGBA", (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_W, 0))

    sheet.save(SHEET)
    MANIFEST.write_text(
        json.dumps(
            {
                "image": "/ai-ashvin-spritesheet.png",
                "frame": {"width": FRAME_W, "height": FRAME_H},
                "poses": [
                    {"name": pose, "x": index * FRAME_W, "y": 0, "width": FRAME_W, "height": FRAME_H}
                    for index, pose in enumerate(POSES)
                ],
            },
            indent=2,
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
