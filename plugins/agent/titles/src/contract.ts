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
