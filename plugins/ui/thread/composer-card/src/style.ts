import { color } from '@sand/dom'

const fade = (role: string, shade: number, percent: number) => `color-mix(in srgb, ${color(role, shade)} ${percent}%, transparent)`

export const css = `
.cc-dock { margin-top: calc(-1 * var(--dock-h, 0px)); }
.cc-glass { background: ${fade('neutral', 800, 92)}; backdrop-filter: blur(12px); }
.cc-drop { border-style: dashed; background: ${fade('accent', 500, 4)}; }
`
