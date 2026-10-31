import type { GitHub, PullSummary } from '@sand/github/contract'
import type { InboxPage, InboxPull } from '../contract'
import { searchPage } from '../search/page'
import { type InboxQuery, sourcesFor } from '../search/sources'
import { createStream, most, type PullStream } from '../stream/stream'
import { createStreams } from '../stream/streams'
import { viewerOf } from '../viewer'
import { readCursor, writeCursor } from './cursor'
import { byGroup, inboxPull } from './pull'

const pageSize = 50

export interface NeedsList {
  viewer: string
  pulls: InboxPull[]
}

export interface InboxDeps {
  github: GitHub
  needsRead(list: NeedsList): void
}

interface Place {
  viewer: string
  id: string
  stream: PullStream
  offset: number
}

export type Inbox = ReturnType<typeof createInbox>

const unfiltered = (query: InboxQuery) => query.view === 'needs' && !query.q?.trim() && !query.repos?.length

const shaped = (viewer: string, pulls: InboxPull[], cursor: string | undefined, capped: boolean): InboxPage => ({
  viewer,
  pulls,
  ...(cursor ? { cursor } : {}),
  ...(capped ? { capped } : {}),
})

export const createInbox = (deps: InboxDeps) => {
  const streams = createStreams()

  const open = (query: InboxQuery, viewer: string, id?: string) => {
    const sources = sourcesFor(query)
    const key = JSON.stringify([viewer.toLowerCase(), sources])
    const make = () => createStream(sources, (source, after) => searchPage(deps.github, source, viewer, after))
    return streams.open(key, make, { id, fresh: !id && query.fresh })
  }

  const needsOf = async (stream: PullStream) => {
    const { found, rest } = await stream.take(most)
    return { pulls: byGroup(found.map(inboxPull)), capped: rest }
  }

  const needsPage = async (query: InboxQuery, { viewer, id, stream, offset }: Place) => {
    const { pulls, capped } = await needsOf(stream)
    if (unfiltered(query)) deps.needsRead({ viewer, pulls })
    const end = offset + pageSize
    return shaped(viewer, pulls.slice(offset, end), end < pulls.length ? writeCursor(id, end) : undefined, capped)
  }

  const listPage = async ({ viewer, id, stream, offset }: Place) => {
    const end = offset + pageSize
    const { found, rest } = await stream.take(end)
    const pulls = found.slice(offset).map(inboxPull)
    return shaped(viewer, pulls, rest && end < most ? writeCursor(id, end) : undefined, rest && end >= most)
  }

  const page = async (query: InboxQuery): Promise<InboxPage> => {
    const viewer = await viewerOf(deps.github)
    const at = readCursor(query.cursor)
    const place = { viewer, offset: at.offset, ...open(query, viewer, at.id) }
    return query.view === 'needs' ? needsPage(query, place) : listPage(place)
  }

  const needs = async (fresh: boolean): Promise<NeedsList> => {
    const viewer = await viewerOf(deps.github)
    const { stream } = open({ view: 'needs', fresh }, viewer)
    const { pulls } = await needsOf(stream)
    return { viewer, pulls }
  }

  return {
    page,
    needs,
    patch(summary: PullSummary) {
      const found = streams.patch(summary)
      return found && inboxPull(found)
    },
    clear: () => streams.clear(),
  }
}
