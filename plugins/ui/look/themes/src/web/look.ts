import { colorVar } from '@vaakx-dev/vrui'
import type { Theme } from '../contract'
import { safeCss } from '../css'
import { scenes, type Frost } from './scenes'

const mix = (role: string, shade: number, percent: number) => `color-mix(in oklab, ${colorVar(role, shade)} ${percent}%, transparent)`

const part = (name: string) => `[data-part="${name}"]`

const blur = (px: number) => `backdrop-filter: blur(${px}px) saturate(1.4); -webkit-backdrop-filter: blur(${px}px) saturate(1.4);`

const frosted = ({ main, side, panel, head }: Frost) => `
${part('app')} { background: transparent !important; }
${part('main')} { background: ${mix('neutral', 900, main)}; }
${part('sidebar')}, ${part('aside')}, ${part('app')} .bg-neutral-950 { background-color: ${mix('neutral', 950, side)} !important; ${blur(24)} }
${part('app')} .bg-neutral-800, ${part('sheet')} { background-color: ${mix('neutral', 800, panel)} !important; ${blur(18)} }
${part('composer')} { box-shadow: 0 0 0 1px ${mix('neutral', 50, 7)} inset, 0 8px 30px -12px rgb(0 0 0 / .35); }
${part('main')} > ${part('header')} { background: ${mix('neutral', 900, head)}; ${blur(16)} }
${part('main')} [data-fade] { background: linear-gradient(to top, ${mix('neutral', 900, main)} 55%, transparent) !important; }
${part('main')} [data-fade="top"] { background: linear-gradient(to bottom, ${mix('neutral', 900, main)}, transparent) !important; }
${part('sidebar')} [data-fade], ${part('aside')} [data-fade] { display: none; }
`

const messages = `${part('user-message')} { background-color: color-mix(in oklab, ${colorVar('accent', 500)} 20%, ${mix('neutral', 800, 72)}) !important; }`

export const sceneCanvasStyle = 'position: fixed; inset: 0; z-index: -1; pointer-events: none; width: 100vw; height: 100vh;'

export const pageCss = (theme: Theme) => [messages, theme.scene ? frosted(scenes[theme.scene].frost) : '', theme.css ? safeCss(theme.css) : ''].join('\n')
