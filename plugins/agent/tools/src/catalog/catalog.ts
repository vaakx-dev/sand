import type { ToolSpec } from '@sand/accounts/contract'
import { type Message, secretMark, type ToolCallBlock } from '@sand/chats/contract'
import type { Conversation, Owner } from '@sand/engine/contract'
import { findName, type Act, type Allow, type Gate, type GroupState, type Offer, type Secrets, type Tool, type ToolGroup, type ToolLoad, type Tools } from '../contract'
import { actOf, run } from '../run'
import type { Choices } from './choices'
import { findTool } from './find'
import { foundIn } from './found'
import { callerSite, checkName } from './names'
import { inScope } from './scope'
import type { Candidate } from './search'
import { spec } from './spec'

const secretNote = `Some tools take secrets, like passwords, keys and one-time codes. Once such a call runs, sand replaces those inputs in the chat with ${secretMark}. The tool got the real values you passed, so a call that shows ${secretMark} was not a mistake.`

const byName = (a: Tool, b: Tool) => a.name.localeCompare(b.name)

export const createCatalog = (choices: Choices, changed: () => void) => {
  const registered = new Map<Tool, string>()
  const groups = new Map<string, ToolGroup>()
  const offers = new Map<Owner, Offer>()
  const allows = new Set<Allow>()
  let gated: Gate | undefined

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

  const fixedAct = (tool: Tool): Act | undefined => (tool.act ? undefined : { effect: tool.effect ?? 'run' })

  const allowed = (conversation: Conversation) => (tool: Tool) => [...allows].every(allow => allow(tool.name, conversation, fixedAct(tool)))

  const allowedAct = (tool: Tool, conversation: Conversation) => (act: Act) => [...allows].every(allow => allow(tool.name, conversation, act))

  const usable = (conversation: Conversation) =>
    inScope(
      tools().filter(tool => loadOf(tool, conversation) !== 'off').filter(allowed(conversation)),
      conversation,
      offered(conversation),
    )

  const specs = (messages: Message[], conversation: Conversation): ToolSpec[] => {
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

  const secrets = (): Secrets =>
    tools().reduce((found, { name, secret }) => (secret?.length ? found.set(name, [...new Set([...(found.get(name) ?? []), ...secret])]) : found), new Map<string, string[]>())

  const notes = (conversation: Conversation) => {
    const scoped = usable(conversation)
    const environments = scoped.flatMap(tool => (tool.environment ? [tool.environment] : []))
    return scoped.some(tool => tool.secret?.length) ? [...environments, secretNote] : environments
  }

  const names = (conversation: Conversation) => [...usable(conversation).map(tool => tool.name), findName]

  const effect = (call: ToolCallBlock, conversation: Conversation) => {
    const tool = resolve(call.name, conversation)
    if (!tool || call.malformed !== undefined) return undefined
    const parsed = tool.input.safeParse(call.input)
    return parsed.success ? actOf(tool, parsed.data, conversation).effect : undefined
  }

  const service: Tools = {
    register,
    secrets,
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
    restrict(allow) {
      changes(() => allows.add(allow))
      return () => changes(() => allows.delete(allow))
    },
    groups: states,
    async choose(name, load) {
      if (!groups.has(name)) throw new Error(`No tool group named "${name}"`)
      await choices.set(name, load)
      changed()
    },
    specs,
    notes,
    names,
    parallel: (call, conversation) => resolve(call.name, conversation)?.parallel === true,
    effect,
    run: (call, context) => {
      const tool = resolve(call.name, context.conversation)
      return run(tool, call, context, tool?.relay ? undefined : gated, tool ? allowedAct(tool, context.conversation) : () => true)
    },
  }
  return service
}
