import { isPcUnavailable, type PeerOutcome, peers } from '@sand/devices-contract'
import type { InputOf, Request } from '@sand/host-hub/contract'
import type { OrchestratorContext } from './context'
import { failure, threadList, threadRead, type ThreadRow, threadStart } from './contract'
import { type ListFilter, listThreads, newestFirst } from './list'

export const createPcs = (ctx: OrchestratorContext) => {
  const owners = new Map<string, string>()

  const linked = () => ctx.get(peers)

  const call = async <I, O>(pc: string, request: Request<I, O>, input: I, timeout?: number) => {
    const found = linked()
    if (!found) throw failure('unavailable', "This PC can't reach your other PCs right now")
    try {
      return await found.call(pc, request, input, { timeout })
    } catch (error) {
      throw isPcUnavailable(error) ? failure('unavailable', error.message) : error
    }
  }

  const named = (name: string) => {
    const pcs = linked()?.list() ?? []
    const found = pcs.find(pc => pc.id === name || pc.name.toLowerCase() === name.toLowerCase())
    if (!found) throw failure('not_found', `No paired PC is called ${name}. Paired PCs: ${pcs.map(pc => pc.name).join(', ') || 'none'}`)
    return found.id
  }

  const locate = async (thread: string) => {
    const known = owners.get(thread)
    if (known) return known
    const outcomes = (await linked()?.callEach(threadRead, { session: thread, limit: 1 })) ?? []
    const owner = outcomes.find(outcome => outcome.ok)?.pc
    if (!owner) throw failure('not_found', `No thread ${thread}`)
    owners.set(thread, owner)
    return owner
  }

  const rowsOf = (outcome: PeerOutcome<ThreadRow[]>, names: Map<string, string>) => {
    if (!outcome.ok) return []
    for (const row of outcome.value) owners.set(row.thread, outcome.pc)
    return outcome.value.map(row => ({ ...row, pc: names.get(outcome.pc) ?? outcome.pc }))
  }

  return {
    call,
    ownerOf: async (thread: string) => (ctx.sessions.open(thread) ? undefined : locate(thread)),
    async start(name: string, input: Omit<InputOf<typeof threadStart>, 'pc'>) {
      const pc = named(name)
      const sent = await call(pc, threadStart, input)
      owners.set(sent.thread, pc)
      return sent
    },
    async list(filter: ListFilter) {
      const here = listThreads(ctx, filter)
      const found = linked()
      if (!found) return here
      const names = new Map(found.list().map(pc => [pc.id, pc.name]))
      const there = (await found.callEach(threadList, filter)).flatMap(outcome => rowsOf(outcome, names))
      return newestFirst([...here, ...there], filter.limit)
    },
  }
}

export type Pcs = ReturnType<typeof createPcs>
