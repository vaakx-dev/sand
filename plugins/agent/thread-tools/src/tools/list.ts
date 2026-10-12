import { eachSettled } from '@sand/kit'
import type { Pc, Pcs, ReachablePc } from '@sand/pc-link/contract'
import type { SessionMatch, SessionSummary } from '@sand/sessions-sqlite/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { threadLine } from '../format'

const group = 'threads'

const pcLine = (pc: ReachablePc) => [`- ${pc.name}`, `id ${pc.id}`, ...(pc.here ? ['this PC'] : []), pc.online ? 'online' : `offline: ${pc.error}`].join(' · ')

export const pcsTool = (pcs: Pcs): Tool => ({
  name: 'pcs',
  group,
  description: 'List this PC and the PCs paired with it, with their ids and whether they answer.',
  input: z.object({}),
  run: async () => (await pcs.list()).map(pcLine).join('\n'),
})

const input = z.object({
  pc: z.string().optional().describe('PC name or id. Defaults to every PC'),
  project: z.string().optional().describe('Only threads in this project (name or id)'),
  query: z.string().optional().describe('Words to search for in the messages'),
  limit: z.number().int().min(1).max(100).default(20),
})

const matchLine = (thread: SessionSummary | SessionMatch) => ('match' in thread ? `\n  "${thread.match}"` : '')

const listOn = (pcs: Pcs, query?: string) => async (pc: Pc) => {
  const [threads, { projects }] = await Promise.all([
    query ? pcs.call<SessionMatch[]>({ type: 'sessions.search', query, limit: 100 }, pc.id) : pcs.threads(pc),
    pcs.projects(pc),
  ])
  const names = new Map(projects.map(project => [project.id, project.name]))
  return threads.map(thread => ({ pc, thread, project: thread.project ? names.get(thread.project) : undefined }))
}

export const threadsTool = (pcs: Pcs): Tool<typeof input> => ({
  name: 'threads',
  group,
  description: 'List threads on this PC and paired PCs, newest first, or search their messages with query. Shows ids, PCs and projects.',
  input,
  async run({ pc, project, query, limit }) {
    const only = pc && (await pcs.find(pc)).id
    const places = (await pcs.list()).filter(place => !only || place.id === only)
    const { values, errors } = await eachSettled(
      places.filter(place => place.online),
      listOn(pcs, query),
    )
    const wanted = project?.toLowerCase()
    const rows = values
      .flat()
      .filter(({ thread }) => thread.kind !== 'agent')
      .filter(row => !wanted || row.thread.project === project || row.project?.toLowerCase() === wanted)
      .sort((a, b) => b.thread.updated - a.thread.updated)
    const offline = places.filter(place => !place.online).map(place => place.error ?? `${place.name} did not answer`)
    const shown = rows.slice(0, limit).map(row => threadLine(row) + matchLine(row.thread))
    const more = rows.length > limit ? [`${rows.length - limit} more; raise limit or narrow the search`] : []
    return [...(shown.length ? shown : ['No threads found']), ...more, ...offline, ...errors].join('\n')
  },
})
