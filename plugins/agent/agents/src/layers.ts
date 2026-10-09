import type { Effort } from '@sand/llm-accounts/contract'
import type { AgentDefinition } from './contract'
import type {} from '@sand/paths/contract'
import type {} from '@sand/watch/contract'
import type { Context } from 'drydock'
import { join } from 'node:path'
import { builtins, loadDefinitions } from './definitions'

export type Resolve = (cwd?: string, project?: string | null) => Promise<Map<string, AgentDefinition>>

const none: AgentDefinition[] = []

export const agentLayers = (
  ctx: Context<'paths' | 'watcher'>,
  defined: Map<string, AgentDefinition>,
  efforts: Effort[],
  changed: () => void,
) => {
  const report = (error: unknown) => ctx.report(error)
  const load = (dir: string) => loadDefinitions([dir], efforts, report)
  const homeDir = join(ctx.paths.home, 'agents')
  const home = ctx.watcher.folders(load, none, changed)
  const projects = ctx.watcher.folders(load, none)
  ctx.effect(() => home.close)
  ctx.effect(() => projects.close)

  const projectLayer = (cwd?: string, id?: string | null) => {
    if (!cwd) return Promise.resolve(none)
    const dir = join(ctx.paths.projectFolder(cwd, id), '.sand', 'agents')
    return dir === homeDir ? Promise.resolve(none) : projects.get(dir)
  }

  const resolve: Resolve = async (cwd, id) => {
    const [own, project] = await Promise.all([home.get(homeDir), projectLayer(cwd, id)])
    return new Map([...builtins, ...defined.values(), ...own, ...project].map(definition => [definition.name, definition]))
  }

  return resolve
}
