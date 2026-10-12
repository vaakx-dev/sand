import { eachSettled } from '@sand/kit'
import type { Session, SessionSummary, ThreadLink } from '@sand/sessions-sqlite/contract'
import type { FoundThread, Pc } from './contract'
import type { Connections } from './connections'

const choiceLine = ({ pc, thread }: FoundThread) => `- "${thread.title}" · id ${thread.id} · ${pc.name}`

const pick = (ref: string, found: FoundThread[], unanswered: string[]) => {
  const byId = found.find(({ thread }) => thread.id === ref)
  if (byId) return byId
  const wanted = ref.toLowerCase()
  const named = found.filter(({ thread }) => thread.kind !== 'agent' && thread.title)
  const exact = named.filter(({ thread }) => thread.title!.toLowerCase() === wanted)
  const matches = exact.length ? exact : named.filter(({ thread }) => thread.title!.toLowerCase().includes(wanted))
  if (matches.length === 1) return matches[0]!
  if (!matches.length) throw new Error([`No thread with the id or name "${ref}"`, ...unanswered].join('\n'))
  throw new Error(`"${ref}" matches ${matches.length} threads; name one by id:\n${matches.slice(0, 8).map(choiceLine).join('\n')}`)
}

export const createThreadLookup = (connections: Connections) => {
  const seen = new Map<string, string>()

  const threads = async (pc: Pc) => {
    const list = await connections.call<SessionSummary[]>({ type: 'sessions.list' }, pc.id)
    for (const thread of list) seen.set(thread.id, pc.id)
    return list
  }

  const around = async (ref: string) => {
    const online = (await connections.list()).filter(pc => pc.online)
    const last = online.find(pc => pc.id === seen.get(ref))
    return last ? [last] : online
  }

  const thread = async (ref: string, at?: string): Promise<FoundThread> => {
    const places = at ? [await connections.find(at)] : await around(ref)
    const { values, errors } = await eachSettled(places, async pc => (await threads(pc)).map(thread => ({ pc, thread })))
    return pick(ref, values.flat(), errors)
  }

  return {
    threads,
    thread,
    async threadOrOwn(own: Session, ref?: string, at?: string) {
      return ref ? thread(ref, at) : thread(own.id, (await connections.find()).id)
    },
    remember: (id: string, pc: Pc) => void seen.set(id, pc.id),
    async link(session: Session): Promise<ThreadLink> {
      const here = await connections.here()
      return { device: here.id, name: here.name, session: session.id }
    },
  }
}
