import type { AgentDefinition, Effort } from '@sand/protocol'
import type { Context } from 'drydock'
import { projectFolder, sandHome, watchedFolders } from '@sand/host'
import { join } from 'node:path'
import { builtins, loadDefinitions } from './definitions'

export type Resolve = (cwd?: string, project?: string | null) => Promise<Map<string, AgentDefinition>>

const none: AgentDefinition[] = []

export const agentLayers = (ctx: Context, defined: Map<string, AgentDefinition>, efforts: Effort[], changed: () => void) => {
  const report = (error: unknown) => ctx.report(error)
  const load = (dir: string) => loadDefinitions([dir], efforts, report)
  const homeDir = join(sandHome(ctx), 'agents')
  const home = watchedFolders(ctx, load, none, changed)
  const projects = watchedFolders(ctx, load, none)

  const projectLayer = (cwd?: string, id?: string | null) => {
    if (!cwd) return Promise.resolve(none)
    const dir = join(projectFolder(cwd, id), '.sand', 'agents')
    return dir === homeDir ? Promise.resolve(none) : projects.get(dir)
  }

  const resolve: Resolve = async (cwd, id) => {
    const [own, project] = await Promise.all([home.get(homeDir), projectLayer(cwd, id)])
    return new Map([...builtins, ...defined.values(), ...own, ...project].map(definition => [definition.name, definition]))
  }

  return resolve
}
