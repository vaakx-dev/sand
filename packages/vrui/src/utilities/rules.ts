import { colorValue } from "./colors";
import { MAX_WIDTH, RADIUS, SHADOW, SPACE, TEXT } from "./scales";

export type Declaration = readonly [property: string, value: string];

export type ResolvedUtility = {
  declarations: readonly Declaration[];
  order: number;
};

const exact: Record<string, ResolvedUtility> = {};

function add(
  order: number,
  names: Record<string, readonly Declaration[]>,
): void {
  for (const [name, declarations] of Object.entries(names)) {
    exact[name] = { declarations, order };
  }
}

add(100, {
  "box-border": [["box-sizing", "border-box"]],
  block: [["display", "block"]],
  "inline-block": [["display", "inline-block"]],
  inline: [["display", "inline"]],
  flex: [["display", "flex"]],
  "inline-flex": [["display", "inline-flex"]],
  grid: [["display", "grid"]],
  hidden: [["display", "none"]],
  contents: [["display", "contents"]],
});

add(110, {
  static: [["position", "static"]],
  fixed: [["position", "fixed"]],
  absolute: [["position", "absolute"]],
  relative: [["position", "relative"]],
  sticky: [["position", "sticky"]],
  "inset-0": [["inset", "0px"]],
  "z-0": [["z-index", "0"]],
  "z-10": [["z-index", "10"]],
  "z-20": [["z-index", "20"]],
  "z-30": [["z-index", "30"]],
  "z-40": [["z-index", "40"]],
  "z-50": [["z-index", "50"]],
});

add(200, {
  "flex-row": [["flex-direction", "row"]],
  "flex-col": [["flex-direction", "column"]],
  "flex-wrap": [["flex-wrap", "wrap"]],
  "flex-nowrap": [["flex-wrap", "nowrap"]],
  "flex-1": [["flex", "1 1 0%"]],
  grow: [["flex-grow", "1"]],
  "grow-0": [["flex-grow", "0"]],
  shrink: [["flex-shrink", "1"]],
  "shrink-0": [["flex-shrink", "0"]],
  "items-start": [["align-items", "flex-start"]],
  "items-center": [["align-items", "center"]],
  "items-end": [["align-items", "flex-end"]],
  "items-stretch": [["align-items", "stretch"]],
  "items-baseline": [["align-items", "baseline"]],
  "justify-start": [["justify-content", "flex-start"]],
  "justify-center": [["justify-content", "center"]],
  "justify-end": [["justify-content", "flex-end"]],
  "justify-between": [["justify-content", "space-between"]],
  "self-start": [["align-self", "flex-start"]],
  "self-center": [["align-self", "center"]],
  "self-end": [["align-self", "flex-end"]],
  "self-stretch": [["align-self", "stretch"]],
});

add(300, {
  "overflow-auto": [["overflow", "auto"]],
  "overflow-hidden": [["overflow", "hidden"]],
  "overflow-visible": [["overflow", "visible"]],
  "overflow-scroll": [["overflow", "scroll"]],
  "cursor-auto": [["cursor", "auto"]],
  "cursor-default": [["cursor", "default"]],
  "cursor-pointer": [["cursor", "pointer"]],
  "pointer-events-none": [["pointer-events", "none"]],
  "pointer-events-auto": [["pointer-events", "auto"]],
  "appearance-none": [["appearance", "none"]],
  "select-none": [["user-select", "none"]],
});

add(400, {
  "m-auto": [["margin", "auto"]],
  "mx-auto": [["margin-inline", "auto"]],
  "my-auto": [["margin-block", "auto"]],
  "mt-auto": [["margin-top", "auto"]],
  "mr-auto": [["margin-right", "auto"]],
  "mb-auto": [["margin-bottom", "auto"]],
  "ml-auto": [["margin-left", "auto"]],
});

add(600, {
  "font-sans": [["font-family", "ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji"]],
  "text-left": [["text-align", "left"]],
  "text-center": [["text-align", "center"]],
  "text-right": [["text-align", "right"]],
  "font-normal": [["font-weight", "400"]],
  "font-medium": [["font-weight", "500"]],
  "font-semibold": [["font-weight", "600"]],
  "font-bold": [["font-weight", "700"]],
  "italic": [["font-style", "italic"]],
  "not-italic": [["font-style", "normal"]],
  "list-none": [["list-style-type", "none"]],
  "whitespace-nowrap": [["white-space", "nowrap"]],
  "uppercase": [["text-transform", "uppercase"]],
  "lowercase": [["text-transform", "lowercase"]],
  "truncate": [
    ["overflow", "hidden"],
    ["text-overflow", "ellipsis"],
    ["white-space", "nowrap"],
  ],
  "no-underline": [["text-decoration-line", "none"]],
  underline: [["text-decoration-line", "underline"]],
});

add(700, {
  "border-0": [["border-width", "0px"]],
  border: [["border-width", "1px"]],
  "border-2": [["border-width", "2px"]],
  // Side widths zero the remaining sides so border-solid does not expose the
  // UA initial `medium` width on them.
  "border-t": [["border-width", "0px"], ["border-top-width", "1px"]],
  "border-r": [["border-width", "0px"], ["border-right-width", "1px"]],
  "border-b": [["border-width", "0px"], ["border-bottom-width", "1px"]],
  "border-l": [["border-width", "0px"], ["border-left-width", "1px"]],
  "border-solid": [["border-style", "solid"]],
  "outline-none": [["outline", "2px solid transparent"], ["outline-offset", "2px"]],
  "shadow-none": [["--vrui-shadow", "0 0 #0000"], ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"]],
  "ring-0": [["--vrui-ring-shadow", "0 0 0 0px var(--vrui-ring-color, currentColor)"], ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"]],
  "ring-1": [["--vrui-ring-shadow", "0 0 0 1px var(--vrui-ring-color, currentColor)"], ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"]],
  "ring-2": [["--vrui-ring-shadow", "0 0 0 2px var(--vrui-ring-color, currentColor)"], ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"]],
  "ring-4": [["--vrui-ring-shadow", "0 0 0 4px var(--vrui-ring-color, currentColor)"], ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"]],
});

add(800, {
  "opacity-0": [["opacity", "0"]],
  "opacity-25": [["opacity", "0.25"]],
  "opacity-50": [["opacity", "0.5"]],
  "opacity-75": [["opacity", "0.75"]],
  "opacity-100": [["opacity", "1"]],
  "transition": [["transition-property", "color, background-color, border-color, box-shadow, opacity, transform"], ["transition-duration", "150ms"]],
  "transition-colors": [["transition-property", "color, background-color, border-color"], ["transition-duration", "150ms"]],
});

function spacing(token: string): ResolvedUtility | undefined {
  const match = /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-(\d+)$/.exec(token);
  if (!match) return;
  const [, kind, key] = match as unknown as [string, string, string];
  const value = SPACE[key as keyof typeof SPACE];
  if (!value) return;

  const properties: Record<string, string[]> = {
    p: ["padding"], px: ["padding-inline"], py: ["padding-block"],
    pt: ["padding-top"], pr: ["padding-right"], pb: ["padding-bottom"], pl: ["padding-left"],
    m: ["margin"], mx: ["margin-inline"], my: ["margin-block"],
    mt: ["margin-top"], mr: ["margin-right"], mb: ["margin-bottom"], ml: ["margin-left"],
    gap: ["gap"], "gap-x": ["column-gap"], "gap-y": ["row-gap"],
  };
  return {
    declarations: properties[kind]!.map((property) => [property, value]),
    order: 400,
  };
}

function size(token: string): ResolvedUtility | undefined {
  const match = /^(w|h|min-w|min-h|max-w|max-h)-(.+)$/.exec(token);
  if (!match) return;
  const [, kind, key] = match as unknown as [string, string, string];
  const property = {
    w: "width", h: "height", "min-w": "min-width", "min-h": "min-height",
    "max-w": "max-width", "max-h": "max-height",
  }[kind]!;
  const named: Record<string, string> = {
    auto: "auto", full: "100%", screen: kind.includes("w") ? "100vw" : "100vh",
    min: "min-content", max: "max-content", fit: "fit-content",
  };
  const value = SPACE[key as keyof typeof SPACE] ??
    (kind === "max-w" ? MAX_WIDTH[key as keyof typeof MAX_WIDTH] : undefined) ??
    named[key];
  if (!value) return;
  return { declarations: [[property, value]], order: 500 };
}

function columns(token: string): ResolvedUtility | undefined {
  const match = /^grid-cols-(\d+)$/.exec(token);
  if (!match) return;
  const count = Number(match[1]);
  if (count < 1 || count > 12) return;
  return {
    declarations: [["grid-template-columns", `repeat(${count}, minmax(0, 1fr))`]],
    order: 210,
  };
}

function textSize(token: string): ResolvedUtility | undefined {
  if (!token.startsWith("text-")) return;
  const key = token.slice(5) as keyof typeof TEXT;
  const value = TEXT[key];
  if (!value) return;
  return {
    declarations: [["font-size", value[0]], ["line-height", value[1]]],
    order: 610,
  };
}

function rounded(token: string): ResolvedUtility | undefined {
  if (token === "rounded") {
    return { declarations: [["border-radius", RADIUS.md]], order: 710 };
  }
  if (!token.startsWith("rounded-")) return;
  const key = token.slice(8) as keyof typeof RADIUS;
  const value = RADIUS[key];
  if (!value) return;
  return { declarations: [["border-radius", value]], order: 710 };
}

function shadow(token: string): ResolvedUtility | undefined {
  if (!token.startsWith("shadow-")) return;
  const key = token.slice(7) as keyof typeof SHADOW;
  const value = SHADOW[key];
  if (!value) return;
  return {
    declarations: [
      ["--vrui-shadow", value],
      ["box-shadow", "var(--vrui-ring-shadow, 0 0 #0000), var(--vrui-shadow, 0 0 #0000)"],
    ],
    order: 720,
  };
}

function color(token: string): ResolvedUtility | undefined {
  const match = /^(accent|bg|text|border|ring)-([a-z][a-z0-9-]*)-(\d+)$/.exec(token);
  if (!match) return;
  const [, kind, name, shade] = match as unknown as [string, string, string, string];
  const value = colorValue(name, shade);
  if (!value) return;
  const property = {
    accent: "accent-color",
    bg: "background-color",
    text: "color",
    border: "border-color",
    ring: "--vrui-ring-color",
  }[kind]!;
  return { declarations: [[property, value]], order: 750 };
}

function simpleColor(token: string): ResolvedUtility | undefined {
  const match = /^(bg|text|border)-(transparent|black|white|current)(?:\/(25|50|75))?$/.exec(token);
  if (!match) return;
  const [, kind, name, opacity] = match as unknown as [string, string, string, string | undefined];
  if (opacity && name !== "black" && name !== "white") return;
  const alpha = opacity ? Number(opacity) / 100 : undefined;
  const value = alpha === undefined
    ? { transparent: "transparent", black: "#000", white: "#fff", current: "currentColor" }[name]!
    : name === "black"
      ? `rgb(0 0 0 / ${alpha})`
      : `rgb(255 255 255 / ${alpha})`;
  const property = { bg: "background-color", text: "color", border: "border-color" }[kind]!;
  return { declarations: [[property, value]], order: 750 };
}

const resolvers = [spacing, size, columns, textSize, rounded, shadow, color, simpleColor];

export function resolveUtility(token: string): ResolvedUtility | undefined {
  const known = exact[token];
  if (known) return known;
  for (const resolve of resolvers) {
    const result = resolve(token);
    if (result) return result;
  }
}
