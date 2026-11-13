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
