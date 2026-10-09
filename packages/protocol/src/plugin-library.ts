export type PluginOrigin = 'builtin' | 'customised' | 'yours'

export interface PluginCustomised {
  version: string
  build: string
  hash: string
  time: number
}

export interface PluginEntry {
  name: string
  area: string
  origin: PluginOrigin
  label?: string
  description?: string
  folder: string
  builtin?: string
  base?: string
  from?: PluginCustomised
  changed: boolean
}

export interface PluginLibrary {
  root: string
  plugins: PluginEntry[]
}
