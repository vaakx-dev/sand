import type { ToolSpec } from '@sand/accounts/contract'
import type { Message } from '@sand/chats/contract'
import type { Conversation, Owner } from '@sand/engine/contract'
import type { Gate, GroupState, Offer, Tool, ToolGroup, ToolLoad, Tools } from '../contract'
import { z } from 'zod'
import { run } from '../run'
import type { Choices } from './choices'
import { findName, findTool } from './find'
import { foundIn } from './found'
import { inScope } from './scope'
import type { Candidate } from './search'

const spec = (tool: Tool): ToolSpec => {
  const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input' })
  return { name: tool.name, description: tool.description, inputSchema }
}

const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)

export const createCatalog = (choices: Choices, changed: () => void) => {
  const tools: Tool[] = []
  const groups = new Map<string, ToolGroup>()
  const offers = new Map<Owner, Offer>()
  let gated: Gate | undefined

  const chosen = (group: ToolGroup) => choices.get(group.name) ?? group.load

  const groupOf = (tool: Tool) => (tool.group ? groups.get(tool.group) : undefined)

  const loadOf = (tool: Tool): ToolLoad => {
    const group = groupOf(tool)
    return group ? chosen(group) : 'always'
  }

  const states = (): GroupState[] =>
    [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(group => ({
        ...group,
        chosen: chosen(group),
        tools: [...new Set(tools.filter(tool => tool.group === group.name).map(tool => tool.name))].sort(),
      }))

  const find = (scoped: Tool[]) => {
    const open = states().filter(group => group.chosen === 'on-demand')
    const candidates: Candidate[] = open.flatMap(group => scoped.filter(tool => tool.group === group.name).map(tool => ({ tool, group })))
    const used = new Set(candidates.map(({ group }) => group.name))
    return findTool(
      open.filter(group => used.has(group.name)),
      candidates,
    )
  }

  const changes = (apply: () => void) => {
    apply()
    changed()
  }

  const register = (tool: Tool) => {
    changes(() => tools.push(tool))
    return () => changes(() => tools.includes(tool) && tools.splice(tools.indexOf(tool), 1))
  }

  const group = (value: ToolGroup) => {
    changes(() => groups.set(value.name, value))
    return () => changes(() => groups.get(value.name) === value && groups.delete(value.name))
  }

  const listed = (scoped: Tool[], load: ToolLoad) => scoped.filter(tool => loadOf(tool) === load).sort(byName)

  const offered = (conversation: Conversation) => offers.get(conversation.owner)?.(conversation) ?? []

  const usable = (conversation: Conversation) => inScope(tools.filter(tool => loadOf(tool) !== 'off'), conversation, offered(conversation))

  const specs = (messages: Message[], conversation: Conversation) => {
    const scoped = usable(conversation)
    const deferred = listed(scoped, 'on-demand')
    const found = foundIn(messages)
    return [
      ...listed(scoped, 'always').map(spec),
      ...(deferred.length ? [spec(find(scoped))] : []),
      ...deferred.map(tool => ({ ...spec(tool), deferred: { found: found.has(tool.name) } })),
    ]
  }

  const resolve = (name: string, conversation: Conversation) => {
    const scoped = usable(conversation)
    return name === findName ? find(scoped) : scoped.find(tool => tool.name === name)
  }

  const service: Tools = {
    register,
    group,
    offer(owner, offer) {
      if (offers.has(owner)) throw new Error(`${owner} conversations already say what they offer tools`)
      changes(() => offers.set(owner, offer))
      return () => changes(() => offers.get(owner) === offer && offers.delete(owner))
    },
    gate(gate) {
      if (gated) throw new Error('Tool calls already have a gate')
      gated = gate
      return () => {
        if (gated === gate) gated = undefined
      }
    },
    groups: states,
    async choose(name, load) {
      if (!groups.has(name)) throw new Error(`No tool group named "${name}"`)
      await choices.set(name, load)
      changed()
    },
    specs,
    notes: conversation => usable(conversation).flatMap(tool => (tool.environment ? [tool.environment] : [])),
    parallel: (call, conversation) => resolve(call.name, conversation)?.parallel === true,
    run: (call, context) => run(resolve(call.name, context.conversation), call, context, gated),
  }
  return service
}
