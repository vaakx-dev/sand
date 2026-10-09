import type { Handle, PanelSpec } from '@sand/dom'

export interface Panels {
  panel(panel: PanelSpec): Handle<Omit<PanelSpec, 'id' | 'render'>>
  show(id: string): void
  toggle(id: string): void
  hide(): void
  current(): string | undefined
  list(): string[]
}

declare module 'drydock' {
  interface Services {
    panels: Panels
  }

  interface Events {
    'panels.change': (current: string | undefined) => void
  }
}
