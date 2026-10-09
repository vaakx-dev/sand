import {
  PALETTE,
  registerColorRole,
  type PaletteName,
  type Shade,
} from "./colors";

export type ColorScale = Partial<Record<Shade, string>>;

export type ColorTheme = {
  readonly colors: Readonly<Record<string, Readonly<ColorScale>>>;
};

export type ColorThemeInput = Record<string, PaletteName | ColorScale>;
export type ColorMode = "light" | "dark";

const ROLE = /^[a-z][a-z0-9-]*$/;

function scale(value: PaletteName | ColorScale): Readonly<ColorScale> {
  if (typeof value === "string") {
    const found = PALETTE[value];
    if (!found) throw new Error(`vrui: unknown color palette: ${value}`);
    return found;
  }
  return Object.freeze({ ...value });
}

export function theme(input: ColorThemeInput): ColorTheme {
  const colors: Record<string, Readonly<ColorScale>> = {};
  for (const [role, value] of Object.entries(input)) {
    if (!ROLE.test(role)) throw new Error(`vrui: invalid color role: ${role}`);
    registerColorRole(role);
    colors[role] = scale(value);
  }
  return Object.freeze({ colors: Object.freeze(colors) });
}

function builtIn(accent: PaletteName): ColorTheme {
  return theme({
    accent,
    neutral: "slate",
    success: "green",
    warning: "amber",
    danger: "red",
  });
}

export const themes = Object.freeze({
  blue: builtIn("blue"),
  indigo: builtIn("indigo"),
  violet: builtIn("violet"),
});

type PreviousProperty = {
  priority: string;
  value: string;
};

export function applyTheme(
  target: HTMLElement,
  colors?: ColorTheme,
  mode?: ColorMode,
): () => void {
  const previous = new Map<string, PreviousProperty>();
  const applied = new Map<string, string>();

  if (colors) {
    for (const [role, values] of Object.entries(colors.colors)) {
      for (const [shade, value] of Object.entries(values)) {
        if (value == null) continue;
        const property = `--vrui-color-${role}-${shade}`;
        previous.set(property, {
          priority: target.style.getPropertyPriority(property),
          value: target.style.getPropertyValue(property),
        });
        applied.set(property, value);
        target.style.setProperty(property, value);
      }
    }
  }

  const previousMode = target.getAttribute("data-vrui-mode");
  if (mode) target.setAttribute("data-vrui-mode", mode);

  return () => {
    for (const [property, value] of applied) {
      if (target.style.getPropertyValue(property) !== value) continue;
      const old = previous.get(property)!;
      if (old.value) target.style.setProperty(property, old.value, old.priority);
      else target.style.removeProperty(property);
    }

    if (mode && target.getAttribute("data-vrui-mode") === mode) {
      if (previousMode == null) target.removeAttribute("data-vrui-mode");
      else target.setAttribute("data-vrui-mode", previousMode);
    }
  };
}
