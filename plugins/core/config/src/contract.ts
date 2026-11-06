import { errorMessage } from '@sand/util'
import { type ContextCore, service } from 'drydock'

export type CliPlace = 'host' | 'runtime' | 'print' | 'cli'

export interface CliFlags {
  model?: string
  effort?: string
  fast?: boolean
}

export type CliValues = Record<string, string | boolean | undefined>

export interface Cli {
  place: CliPlace
  home: string
  cwd: string
  builtins: string
  safe: boolean
  args: string[]
  prompt?: string
  exit(code?: number, afterwards?: () => Promise<void>): void
}

export interface SandConfig {
  path: string
  section(name: string): unknown
}

export interface PluginOff {
  id: string
  dir: string
  needs: string[]
}

export interface PluginSwitches {
  turnedOff(dir: string): boolean
  needs(missing: string[]): string[] | undefined
  off(): PluginOff[]
}

export type FeatureKind = 'feature' | 'capability'

export interface FeatureDefinition {
  id: string
  kind: FeatureKind
  label: string
  summary: string
  parent?: string
  needs: string[]
  uses: string[]
  offer: boolean
  stops?: string
}

export interface Feature extends FeatureDefinition {
  chosen: boolean
  on: boolean
  usedBy: string[]
}

export interface Features {
  list(): Feature[]
  asked(): boolean
  set(changes: Record<string, boolean>): Promise<void>
}

export const cli = service<Cli>('cli')
export const features = service<Features>('features')
export const sandConfig = service<SandConfig>('sandConfig')
export const pluginSwitches = service<PluginSwitches>('pluginSwitches')

export const pluginProblems = (ctx: ContextCore) =>
  ctx.scopes().flatMap(scope => {
    if (scope.kind !== 'plugin') return []
    if (scope.status === 'failed') return [{ id: scope.name, error: errorMessage(scope.error) }]
    if (scope.status === 'pending' && !ctx.get(pluginSwitches)?.needs(scope.missing())) return [{ id: scope.name, error: `waiting for: ${scope.missing().join(', ')}` }]
    return []
  })
