import type { ToolSpec } from '@sand/llm-accounts/contract'
import type { Message } from '@sand/messages'
import type { GroupState, Tool, ToolGroup, ToolLoad, Tools } from '../contract'
import { z } from 'zod'
import { run } from '../run'
import type { Choices } from './choices'
import { findTool } from './find'
import { foundIn } from './found'
import type { Candidate } from './search'

const spec = (tool: Tool): ToolSpec => {
  const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input' })
  return { name: tool.name, description: tool.description, inputSchema }
}

const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)

export const createCatalog = (choices: Choices, changed: () => void) => {
  const tools = new Map<string, Tool>()
  const groups = new Map<string, ToolGroup>()

  const chosen = (group: ToolGroup) => choices.get(group.name) ?? group.load

  const loadOf = (tool: Tool): ToolLoad => {
    const group = tool.group ? groups.get(tool.group) : undefined
    return group ? chosen(group) : 'always'
  }

  const states = (): GroupState[] =>
    [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(group => ({
        ...group,
        chosen: chosen(group),
        tools: [...tools.values()].filter(tool => tool.group === group.name).sort(byName).map(tool => tool.name),
      }))

  const onDemand = () => states().filter(group => group.chosen === 'on-demand' && group.tools.length)

  const candidates = (): Candidate[] =>
    onDemand().flatMap(group => group.tools.flatMap(name => tools.get(name) ?? []).map(tool => ({ tool, group })))

  const added = <T>(map: Map<string, T>, key: string, value: T) => {
    map.set(key, value)
    changed()
    return () => {
      if (map.get(key) === value) map.delete(key)
      changed()
    }
  }

  const find = findTool(onDemand, candidates)

  const listed = (load: ToolLoad) => [...tools.values()].filter(tool => loadOf(tool) === load).sort(byName)

  const specs = (messages: Message[]) => {
    const deferred = listed('on-demand')
    const found = foundIn(messages)
    return [
      ...listed('always').map(spec),
      ...(deferred.length ? [spec(find)] : []),
      ...deferred.map(tool => ({ ...spec(tool), deferred: { found: found.has(tool.name) } })),
    ]
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
    notes: () => [...tools.values()].flatMap(tool => (tool.environment && loadOf(tool) !== 'off' ? [tool.environment] : [])),
    run: (call, context) => run(call.name === find.name ? find : tools.get(call.name), call, context),
  }
  return service
}

