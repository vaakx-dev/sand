import type { ToolSpec } from '@sand/llm-accounts/contract'
import type { Message } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { GroupState, Tool, ToolGroup, ToolLoad, Tools } from '../contract'
import { z } from 'zod'
import { run } from '../run'
import type { Choices } from './choices'
import { findName, findTool } from './find'
import { foundIn } from './found'
import type { Candidate } from './search'

const spec = (tool: Tool): ToolSpec => {
  const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input' })
  return { name: tool.name, description: tool.description, inputSchema }
}

const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)

const openTo = (group: ToolGroup, session: Session) => !(group.mainOnly && session.kind === 'agent')

export const createCatalog = (choices: Choices, changed: () => void) => {
  const tools = new Map<string, Tool>()
  const groups = new Map<string, ToolGroup>()

  const chosen = (group: ToolGroup) => choices.get(group.name) ?? group.load

  const groupOf = (tool: Tool) => (tool.group ? groups.get(tool.group) : undefined)

  const loadOf = (tool: Tool): ToolLoad => {
    const group = groupOf(tool)
    return group ? chosen(group) : 'always'
  }

  const usable = (tool: Tool, session: Session) => {
    const group = groupOf(tool)
    return !group || openTo(group, session)
  }

  const states = (): GroupState[] =>
    [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(group => ({
        ...group,
        chosen: chosen(group),
        tools: [...tools.values()].filter(tool => tool.group === group.name).sort(byName).map(tool => tool.name),
      }))

  const onDemand = (session: Session) => states().filter(group => group.chosen === 'on-demand' && group.tools.length && openTo(group, session))

  const find = (session: Session) => {
    const open = onDemand(session)
    const candidates: Candidate[] = open.flatMap(group => group.tools.flatMap(name => tools.get(name) ?? []).map(tool => ({ tool, group })))
    return findTool(open, candidates)
  }

  const added = <T>(map: Map<string, T>, key: string, value: T) => {
    map.set(key, value)
    changed()
    return () => {
      if (map.get(key) === value) map.delete(key)
      changed()
    }
  }

  const listed = (load: ToolLoad, session: Session) =>
    [...tools.values()].filter(tool => loadOf(tool) === load && usable(tool, session)).sort(byName)

  const specs = (messages: Message[], session: Session) => {
    const deferred = listed('on-demand', session)
    const found = foundIn(messages)
    return [
      ...listed('always', session).map(spec),
      ...(deferred.length ? [spec(find(session))] : []),
      ...deferred.map(tool => ({ ...spec(tool), deferred: { found: found.has(tool.name) } })),
    ]
  }

  const resolve = (name: string, session: Session) => {
    if (name === findName) return find(session)
    const tool = tools.get(name)
    return tool && usable(tool, session) ? tool : undefined
  }

  const service: Tools = {
    register: tool => added(tools, tool.name, tool),
    group: group => added(groups, group.name, group),
    groups: states,
    async choose(name, load) {
      if (!groups.has(name)) throw new Error(`No tool group named "${name}"`)
      await choices.set(name, load)
      changed()
    },
    specs,
    notes: session => [...tools.values()].flatMap(tool => (tool.environment && loadOf(tool) !== 'off' && usable(tool, session) ? [tool.environment] : [])),
    parallel: (call, session) => resolve(call.name, session)?.parallel === true,
    run: (call, context) => run(resolve(call.name, context.session), call, context),
  }
  return service
}
