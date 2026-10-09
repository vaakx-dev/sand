import type { ToolDecision } from '@sand/loops/contract'
import type { ToolCallBlock } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { readManifest } from './draft/manifest'
import { draftsDir, pluginsDir, shortPath } from './draft/paths'

const fileTools = new Set(['write', 'edit'])

const isLoopPlugin = async (home: string, name: string) => Boolean((await readManifest(join(pluginsDir(home), name)))?.loops.length)

const loopPlugins = async (home: string) => {
  const entries = await readdir(pluginsDir(home), { withFileTypes: true }).catch(() => [])
  const names = entries.filter(entry => entry.isDirectory() || entry.isSymbolicLink()).map(entry => entry.name)
  const flags = await Promise.all(names.map(name => isLoopPlugin(home, name)))
  return names.filter((_, index) => flags[index])
}

const pluginOfPath = (home: string, cwd: string, path: string) => {
  const rel = relative(pluginsDir(home), resolve(cwd, path))
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return undefined
  return rel.split(sep)[0]
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const spellings = (home: string, name: string) => {
  const folder = join(pluginsDir(home), name)
  const rel = relative(homedir(), folder)
  const fromHome = rel && !rel.startsWith('..') ? [`~/${rel}`, `$HOME/${rel}`, `\${HOME}/${rel}`] : []
  return [folder, ...fromHome]
}

const mentions = (command: string, home: string, name: string) =>
  spellings(home, name).some(form => new RegExp(`${escape(form)}(?![\\w.-])`).test(command))

const deny = (home: string, name: string): ToolDecision => ({
  action: 'deny',
  reason: `Loop plugins change through a trial: copy to ${shortPath(join(draftsDir(home), name))}, edit there, then call loop_trial.`,
})

const inputOf = (call: ToolCallBlock) => (call.input && typeof call.input === 'object' ? (call.input as Record<string, unknown>) : {})

export const loopGuard = (home: string) => async (call: ToolCallBlock, session: Session): Promise<ToolDecision | undefined> => {
  const input = inputOf(call)
  if (fileTools.has(call.name) && typeof input.path === 'string') {
    const name = pluginOfPath(home, session.cwd, input.path)
    return name && (await isLoopPlugin(home, name)) ? deny(home, name) : undefined
  }
  if (call.name === 'shell' && typeof input.command === 'string') {
    const command = input.command
    const name = (await loopPlugins(home)).find(plugin => mentions(command, home, plugin))
    return name ? deny(home, name) : undefined
  }
  return undefined
}
