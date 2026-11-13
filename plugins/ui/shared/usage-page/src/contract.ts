import { type Dispose, service } from 'drydock'

export interface UsageView {
  id: string
  label: string
  order: number
  render(): HTMLElement
}

export interface UsageViews {
  add(view: UsageView): Dispose
}

export const usageViews = service<UsageViews>('usageViews')

export { modelShades, type Shade, swatch, TONE_FILL, TONE_TEXT, type Tone, toneOf } from './look'
