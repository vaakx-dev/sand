import type { Session } from '@sand/sessions-sqlite/contract'

export interface Names {
  suggest(session: Session): Promise<string | undefined>
}

declare module 'drydock' {
  interface Services {
    names: Names
  }
}

export interface TitleSettings {
  auto: boolean
  model?: string
}

export type TitlePatch = Partial<TitleSettings>

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'titles.get': {}
    'titles.save': TitlePatch
  }

  interface WireEvents {
    'titles.change': [settings: TitleSettings]
  }
}
