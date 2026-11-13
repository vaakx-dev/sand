import type { LimitWindow } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'

export type Tone = 'even' | 'ahead' | 'out'

export interface Shade {
  color: string
  opacity: number
}

interface Shaded {
  provider: string
}

const PACE_MARGIN = 0.05
const OPACITIES = [1, 0.6, 0.35, 0.2]

export const TONE_TEXT: Record<Tone, string> = {
  even: 'text-neutral-100',
  ahead: 'text-warning-400',
  out: 'text-danger-400',
}

export const TONE_FILL: Record<Tone, string> = {
  even: 'bg-neutral-600',
  ahead: 'bg-warning-400/45',
  out: 'bg-danger-400/20',
}

export const elapsedOf = (window: LimitWindow, now: number) => {
  if (!window.duration || !window.resetsAt) return undefined
  const elapsed = 1 - (window.resetsAt - now) / window.duration
  return elapsed > 0 && elapsed < 1 ? elapsed : undefined
}

const aheadOfPace = (window: LimitWindow, now: number) => {
  const elapsed = elapsedOf(window, now)
  return elapsed !== undefined && elapsed > PACE_MARGIN && window.used - elapsed > PACE_MARGIN
}

export const toneOf = (window: LimitWindow, now: number, outAt?: number): Tone => {
  if (window.used >= 1) return 'out'
  return outAt !== undefined || aheadOfPace(window, now) ? 'ahead' : 'even'
}

export const modelShades = <T extends Shaded>(kit: Kit, ranked: T[]) => {
  const providers = [...new Set(ranked.map(model => model.provider))]
  const ranks = new Map<string, number>()
  const shades = new Map<T, Shade>()
  for (const model of ranked) {
    const rank = ranks.get(model.provider) ?? 0
    ranks.set(model.provider, rank + 1)
    shades.set(model, { color: kit.providerColor(model.provider, providers.indexOf(model.provider)), opacity: OPACITIES[Math.min(rank, OPACITIES.length - 1)] ?? 1 })
  }
  return (model: T): Shade => shades.get(model) ?? { color: kit.providerColor(model.provider), opacity: 1 }
}

export const swatch = ({ color, opacity }: Shade) => span({ class: 'h-2 w-2 shrink-0 rounded-sm', style: { backgroundColor: color, opacity } })
