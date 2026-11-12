import type { ToolSpec } from '@sand/accounts/contract'
import type { Message, ToolCallBlock } from '@sand/chats/contract'
import type { Conversation, Owner } from '@sand/engine/contract'
import type { GroupState, Offer, Tool, ToolGroup, ToolLoad, Tools } from '../contract'
import { z } from 'zod'
import { run } from '../run'
import type { Choices } from './choices'
import { findName, findTool } from './find'
import { foundIn } from './found'
import { callerSite, checkName } from './names'
import { inScope } from './scope'
import type { Candidate } from './search'

const withoutSafeIntegerBounds = ({ jsonSchema }: { jsonSchema: z.core.JSONSchema.BaseSchema }) => {
  if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum
  if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum
}

const spec = (tool: Tool): ToolSpec => {
  const { $schema, ...inputSchema } = z.toJSONSchema(tool.input, { io: 'input', override: withoutSafeIntegerBounds })
  return { name: tool.name, description: tool.description, inputSchema }
}

const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)

export const createCatalog = (choices: Choices, changed: () => void) => {
  const registered = new Map<Tool, string>()
  const groups = new Map<string, ToolGroup>()
  const offers = new Map<Owner, Offer>()

  const chosen = (group: ToolGroup) => choices.get(group.name) ?? group.load

  const groupOf = (tool: Tool) => (tool.group ? groups.get(tool.group) : undefined)

  const tools = () => [...registered.keys()]

  const loadOf = (tool: Tool, conversation: Conversation): ToolLoad => {
    if (tool.always?.includes(conversation.owner)) return 'always'
    const group = groupOf(tool)
    return group ? chosen(group) : 'always'
  }

  const states = (): GroupState[] =>
    [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(group => ({
        ...group,
        chosen: chosen(group),
        tools: [...new Set(tools().filter(tool => tool.group === group.name).map(tool => tool.name))].sort(),
      }))

  const find = (deferred: Tool[]) => {
    const open = states().filter(group => group.chosen === 'on-demand')
    const candidates: Candidate[] = open.flatMap(group => deferred.filter(tool => tool.group === group.name).map(tool => ({ tool, group })))
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
    const site = callerSite()
    checkName(tool, site, registered)
    changes(() => registered.set(tool, site))
    return () => changes(() => registered.delete(tool))
  }

  const group = (value: ToolGroup) => {
    changes(() => groups.set(value.name, value))
    return () => changes(() => groups.get(value.name) === value && groups.delete(value.name))
  }

  const listed = (scoped: Tool[], load: ToolLoad, conversation: Conversation) => scoped.filter(tool => loadOf(tool, conversation) === load).sort(byName)

  const offered = (conversation: Conversation) => offers.get(conversation.owner)?.(conversation) ?? []

  const usable = (conversation: Conversation) => inScope(tools().filter(tool => loadOf(tool, conversation) !== 'off'), conversation, offered(conversation))

  const specs = (messages: Message[], conversation: Conversation) => {
    const scoped = usable(conversation)
    const deferred = listed(scoped, 'on-demand', conversation)
    const found = foundIn(messages)
    return [
      ...listed(scoped, 'always', conversation).map(spec),
      ...(deferred.length ? [spec(find(deferred))] : []),
      ...deferred.map(tool => ({ ...spec(tool), deferred: { found: found.has(tool.name) } })),
    ]
  }

  const resolve = (name: string, conversation: Conversation) => {
    const scoped = usable(conversation)
    return name === findName ? find(listed(scoped, 'on-demand', conversation)) : scoped.find(tool => tool.name === name)
  }

  const effect = (call: ToolCallBlock, conversation: Conversation) => {
    const tool = resolve(call.name, conversation)
    return tool && call.malformed === undefined ? (tool.effect ?? 'run') : undefined
  }

  const service: Tools = {
    register,
    group,
    offer(owner, offer) {
      if (offers.has(owner)) throw new Error(`${owner} conversations already say what they offer tools`)
      changes(() => offers.set(owner, offer))
      return () => changes(() => offers.get(owner) === offer && offers.delete(owner))
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
    effect,
    run: (call, context) => run(resolve(call.name, context.conversation), call, context),
  }
  return service
}
