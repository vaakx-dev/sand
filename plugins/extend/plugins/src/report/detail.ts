import { type Context, inspector } from 'drydock'
import type { PluginDetail, PluginRow } from '../contract'
import { folderName } from '../folder'
import { report } from './build'

const STACK_LINES = 8

const stackOf = (error: unknown) => (error instanceof Error ? error.stack?.split('\n').slice(0, STACK_LINES).join('\n') : undefined)

const rowNamed = (rows: PluginRow[], name: string) =>
  rows.find(row => row.name === name) ?? rows.find(row => (row.folder && folderName(row.folder) === name) || row.web?.id === name)

const detail = (ctx: Context, name: string): PluginDetail => {
  const row = rowNamed(report(ctx), name)
  if (!row) throw new Error(`No plugin named ${name}`)
  const scope = ctx.scopes().find(candidate => candidate.kind === 'plugin' && candidate.name === row.name)
  const found = ctx.get(inspector)
  const provides = found?.services().filter(service => service.provider === row.name && service.active).map(service => service.id) ?? []
  const hooks = found?.hooks().filter(hook => hook.handlers.some(handler => handler.plugin === row.name)).map(hook => hook.id) ?? []
  return { ...row, stack: stackOf(scope?.error), provides, hooks }
}

export { detail }
