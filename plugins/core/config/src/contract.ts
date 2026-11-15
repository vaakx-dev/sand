import { errorMessage } from '@sand/util'
import { type ContextCore, type ScopeView, service, type Status } from 'drydock'
import type { TomlValues } from './toml'

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
  set(table: string[], values: TomlValues): Promise<void>
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
  folder(scope: ScopeView): string | undefined
  addon(scope: ScopeView): string | undefined
  fault(addon: string, error: string): Promise<void>
}

export interface PluginState {
  name: string
  folder?: string
  addon?: string
  status: Status | 'off'
  problem?: string
  needs?: string[]
}

export interface PluginProblem {
  id: string
  error: string
  addon?: string
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
  addon: boolean
  stops?: string
}

export interface Feature extends FeatureDefinition {
  chosen: boolean
  on: boolean
  usedBy: string[]
}

export interface Features {
  list(): Feature[]
  on(id: string): boolean
  set(changes: Record<string, boolean>): Promise<void>
  refresh(): Promise<void>
}

export { definitionsIn, featureOf } from './features/definitions'
export { setTomlValues, type TomlValue, type TomlValues } from './toml'

export const cli = service<Cli>('cli')
export const features = service<Features>('features')
export const sandConfig = service<SandConfig>('sandConfig')
export const pluginSwitches = service<PluginSwitches>('pluginSwitches')

const problemOf = (scope: ScopeView) => {
  if (scope.status === 'failed') return errorMessage(scope.error)
  if (scope.status === 'pending') return `waiting for: ${scope.missing().join(', ')}`
  return undefined
}

const scopeState = (scope: ScopeView, switches: PluginSwitches | undefined): PluginState => {
  const folder = switches?.folder(scope)
  const addon = switches?.addon(scope)
  const needs = scope.status === 'pending' ? switches?.needs(scope.missing()) : undefined
  if (needs) return { name: scope.name, folder, addon, status: 'off', needs }
  return { name: scope.name, folder, addon, status: scope.status, problem: problemOf(scope) }
}

const turnedOffState = ({ id, dir }: PluginOff): PluginState => ({ name: id, folder: dir, status: 'off', needs: [] })

export const pluginStates = (ctx: ContextCore): PluginState[] => {
  const switches = ctx.get(pluginSwitches)
  const loaded = ctx.scopes().flatMap(scope => (scope.kind === 'plugin' ? [scopeState(scope, switches)] : []))
  const turnedOff = (switches?.off() ?? []).filter(plugin => !plugin.needs.length).map(turnedOffState)
  return [...loaded, ...turnedOff]
}

export const pluginProblems = (ctx: ContextCore): PluginProblem[] =>
  pluginStates(ctx).flatMap(({ name, problem, addon }) => (problem ? [{ id: name, error: problem, ...(addon && { addon }) }] : []))

export const coreProblems = (ctx: ContextCore) => pluginProblems(ctx).filter(problem => !problem.addon)
