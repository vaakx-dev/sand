"""Stitch a before and after screenshot into one framed, annotated image.

Run with a JSON spec, flags, or both (flags win):

  python stitch.py spec.json
  python stitch.py --before b.png --after a.png --out menu.png --title "Main menu" \\
      --mark "1 box 2200,1060,2722,1124" --legend "Ad blocker is now Shield"

Spec keys: before, after, out, title, labels [before, after], crop [x0, y0, x1, y1],
layout (auto, side or stack), marks, legend (one line per number, in order).
Paths in a spec are relative to the spec file.

A mark is {"n": 1, "box": [x0, y0, x1, y1]} or {"n": 3, "bracket": [x, y0, y1]}.
Give {"before": [...], "after": [...]} instead of one list when the spot moved;
leave a side out to mark it on one half only. On the command line:
"1 box X0,Y0,X1,Y1", "2 box BEFORE AFTER", "4 box - AFTER", "3 bracket X,Y0,Y1".
Coordinates are pixels in the original screenshots, before cropping. Give the
element's own bounds: the box is drawn a few pixels outside them.
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("stitch.py needs Pillow: python -m pip install pillow")

FRAME = (24, 26, 30)
EDGE = (78, 84, 94)
TEXT = (236, 238, 242)
MUTED = (150, 156, 166)
AMBER = (255, 184, 0)
INK = (20, 20, 20)

FONTS = {
    "regular": ["C:/Windows/Fonts/segoeui.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"],
    "bold": ["C:/Windows/Fonts/segoeuib.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"],
}

BASE_WIDTH = 1700
BOX_MARGIN = 8
SIDES = ("before", "after")
HEADINGS = {"before": "Before", "after": "After"}
SIZES = {
    "pad": 56, "gap": 48, "heading": 64, "title": 70, "legend_gap": 24, "legend_row": 54,
    "badge": 24, "title_font": 40, "heading_font": 34, "label_font": 26, "legend_font": 28,
    "badge_font": 28, "label_gap": 18, "solid": 5, "dashed": 4, "dash": 18, "dash_gap": 12, "radius": 10, "tick": 18,
}


def font(weight, size):
    for path in FONTS[weight]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


class Style:
    def __init__(self, scale):
        self.size = {name: round(value * scale) for name, value in SIZES.items()}

    def __getattr__(self, name):
        return self.size[name]


def parse_points(text):
    return None if text == "-" else [int(value) for value in text.split(",")]


def parse_mark(text):
    number, kind, *places = text.split()
    if len(places) == 1:
        return {"n": int(number), kind: parse_points(places[0])}
    return {"n": int(number), kind: dict(zip(SIDES, map(parse_points, places)))}


def read_args():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("spec", nargs="?", type=Path)
    parser.add_argument("--before", type=Path)
    parser.add_argument("--after", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--title")
    parser.add_argument("--labels", nargs=2, metavar=("BEFORE", "AFTER"))
    parser.add_argument("--crop", type=parse_points, metavar="X0,Y0,X1,Y1")
    parser.add_argument("--layout", choices=["auto", "side", "stack"])
    parser.add_argument("--mark", dest="marks", action="append", type=parse_mark)
    parser.add_argument("--legend", action="append")
    return parser.parse_args()


def load_spec(args):
    spec = {"layout": "auto", "labels": None, "crop": None, "marks": [], "legend": []}
    if args.spec:
        base = args.spec.parent
        loaded = json.loads(args.spec.read_text(encoding="utf-8"))
        spec |= loaded | {key: base / loaded[key] for key in ("before", "after", "out") if key in loaded}
    spec |= {key: value for key, value in vars(args).items() if key != "spec" and value is not None}
    missing = [key for key in ("before", "after", "out", "title") if key not in spec]
    if missing:
        sys.exit(f"missing {', '.join(missing)}")
    return spec


def place(mark, side):
    kind = "box" if "box" in mark else "bracket"
    where = mark[kind]
    points = where.get(side) if isinstance(where, dict) else where
    return None if points is None else (kind, points)


def shot(path, crop):
    image = Image.open(path).convert("RGB")
    return image.crop(crop) if crop else image


def chosen_layout(layout, image):
    if layout != "auto":
        return layout
    return "side" if image.height > image.width else "stack"


def content_width(layout, before, after, style):
    if layout == "side":
        return before.width + after.width + 4 * 2 + style.gap
    return max(before.width, after.width) + 4


def wrapped(text, typeface, width, measure):
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if line and measure(candidate, font=typeface) > width:
            lines.append(line)
            candidate = word
        line = candidate
    return lines + [line]


def dashed_line(draw, start, end, style):
    (x0, y0), (x1, y1) = start, end
    length = max(abs(x1 - x0), abs(y1 - y0))

    def point(distance):
        return x0 + (x1 - x0) * distance // length, y0 + (y1 - y0) * distance // length

    for offset in range(0, length, style.dash + style.dash_gap):
        draw.line([point(offset), point(min(offset + style.dash, length))], fill=AMBER, width=style.dashed)


def draw_box(draw, rect, side, style):
    x0, y0, x1, y1 = rect
    if side == "after":
        draw.rounded_rectangle(rect, radius=style.radius, outline=AMBER, width=style.solid)
        return
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    for start, end in zip(corners, corners[1:] + corners[:1]):
        dashed_line(draw, start, end, style)


def draw_bracket(draw, x, y0, y1, tick, side, style):
    width = style.solid if side == "after" else style.dashed
    draw.line([(x + tick, y0), (x, y0), (x, y1), (x + tick, y1)], fill=AMBER, width=width, joint="curve")


def draw_badge(draw, center, number, style):
    x, y = center
    radius = style.badge
    draw.ellipse([x - radius - 3, y - radius - 3, x + radius + 3, y + radius + 3], fill=FRAME)
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=AMBER)
    draw.text((x, y + 1), str(number), font=font("bold", style.badge_font), fill=INK, anchor="mm")


def box_rect(points, origin, bounds, style):
    (x, y), (left, top, right, bottom) = origin, bounds
    x0, y0, x1, y1 = points
    return [max(x + x0 - BOX_MARGIN, left + style.solid), max(y + y0 - BOX_MARGIN, top + style.solid),
            min(x + x1 + BOX_MARGIN, right - style.solid), min(y + y1 + BOX_MARGIN, bottom - style.solid)]


def draw_marks(draw, marks, side, origin, bounds, style):
    (x, y), (left, _, right, _) = origin, bounds
    badges = []
    for mark in marks:
        match place(mark, side):
            case ("box", points):
                rect = box_rect(points, origin, bounds, style)
                draw_box(draw, rect, side, style)
                badges.append((mark["n"], (rect[0], rect[1])))
            case ("bracket", (bracket_x, y0, y1)):
                line_x = x + bracket_x
                tick = style.tick if line_x < (left + right) / 2 else -style.tick
                draw_bracket(draw, line_x, y + y0, y + y1, tick, side, style)
                badges.append((mark["n"], (line_x, y + (y0 + y1) // 2)))
    for number, center in badges:
        draw_badge(draw, center, number, style)


def draw_heading(draw, origin, side, label, style):
    x, y = origin
    middle = y + style.heading // 2
    typeface = font("bold", style.heading_font)
    draw.text((x, middle), HEADINGS[side], font=typeface, fill=TEXT, anchor="lm")
    if label:
        offset = draw.textlength(HEADINGS[side], font=typeface) + style.label_gap
        draw.text((x + offset, middle + 2), label, font=font("regular", style.label_font), fill=MUTED, anchor="lm")


def panel_origins(layout, before, style):
    top = style.pad + style.title
    if layout == "side":
        return {"before": (style.pad, top), "after": (style.pad + before.width + 4 + style.gap, top)}
    return {"before": (style.pad, top), "after": (style.pad, top + style.heading + before.height + 4 + style.gap)}


def legend_lines(legend, width, style, measure):
    typeface = font("regular", style.legend_font)
    text_width = width - 2 * style.badge - 20
    return [(number, wrapped(text, typeface, text_width, measure)) for number, text in enumerate(legend, 1)]


def draw_legend(draw, top, entries, width, style):
    draw.line([(style.pad, top), (style.pad + width, top)], fill=EDGE, width=2)
    typeface = font("regular", style.legend_font)
    y = top + style.legend_gap - 4
    for number, lines in entries:
        draw_badge(draw, (style.pad + style.badge, y + style.badge), number, style)
        for line in lines:
            draw.text((style.pad + 2 * style.badge + 20, y + style.badge), line, font=typeface, fill=TEXT, anchor="lm")
            y += style.legend_row


def stitch(spec):
    shots = {side: shot(spec[side], spec["crop"]) for side in SIDES}
    layout = chosen_layout(spec["layout"], shots["before"])
    style = Style(1)
    width = content_width(layout, shots["before"], shots["after"], style)
    style = Style(max(1, width / BASE_WIDTH))
    width = content_width(layout, shots["before"], shots["after"], style)
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength
    entries = legend_lines(spec["legend"], width, style, measure)
    origins = panel_origins(layout, shots["before"], style)
    panels_bottom = max(y + style.heading + shots[side].height + 4 for side, (x, y) in origins.items())
    legend_top = panels_bottom + style.legend_gap
    legend_height = style.legend_gap + sum(len(lines) for _, lines in entries) * style.legend_row if entries else 0
    canvas = Image.new("RGB", (width + 2 * style.pad, legend_top + legend_height + style.pad), FRAME)
    draw = ImageDraw.Draw(canvas)
    draw.text((style.pad, style.pad + style.title // 2 - 8), spec["title"], font=font("bold", style.title_font),
              fill=TEXT, anchor="lm")
    labels = dict(zip(SIDES, spec["labels"] or [None, None]))
    crop_left, crop_top = spec["crop"][:2] if spec["crop"] else (0, 0)
    for side, (x, y) in origins.items():
        image = shots[side]
        draw_heading(draw, (x, y), side, labels[side], style)
        draw.rectangle([x, y + style.heading, x + image.width + 3, y + style.heading + image.height + 3], fill=EDGE)
        canvas.paste(image, (x + 2, y + style.heading + 2))
        image_left, image_top = x + 2, y + style.heading + 2
        origin = (image_left - crop_left, image_top - crop_top)
        bounds = (image_left, image_top, image_left + image.width, image_top + image.height)
        draw_marks(draw, spec["marks"], side, origin, bounds, style)
    if entries:
        draw_legend(draw, legend_top, entries, width, style)
    return canvas


def alt_text(spec):
    changes = "; ".join(f"{text} ({number})" for number, text in enumerate(spec["legend"], 1))
    return f"![{spec['title']} before and after: {changes}](./{Path(spec['out']).name})"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    spec = load_spec(read_args())
    canvas = stitch(spec)
    canvas.save(spec["out"], optimize=True)
    print(f"{spec['out']} {canvas.width}x{canvas.height}")
    print(alt_text(spec))


main()
