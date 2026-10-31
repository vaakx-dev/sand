import { event, service, type Dispose } from 'drydock'

export interface PanelSpec {
  id: string
  title: string
  icon?: string
  order?: number
  badge?: string | number
  attention?: boolean
  hidden?: boolean
  render(body: HTMLElement): Dispose | void
}

export type PanelPatch = Partial<Omit<PanelSpec, 'id' | 'render'>>

export interface PanelHandle {
  update(patch: PanelPatch): void
  dispose(): void
}

export interface Panels {
  panel(panel: PanelSpec): PanelHandle
  show(id: string): void
  hide(): void
  current(): string | undefined
}

export const panels = service<Panels>('panels')
export const panelsChange = event<(current: string | undefined) => void>('panels.change')
