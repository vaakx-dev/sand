import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

export interface Author {
  owner: 'thread' | 'bot'
  id: string
  name: string
}

export interface Entry {
  id: string
  at: number
  updated: number
  project: string | null
  author: Author | null
  title: string
  details: string
  links: string[]
  tags: string[]
}

export interface Removed {
  id: string
  updated: number
  removed: true
}

export type Revision = Entry | Removed

export interface TagUse {
  tag: string
  count: number
}

export type Versions = Record<string, number>

export interface Exchanged {
  revisions: Revision[]
  wanted: string[]
}

export const titleLimit = 120

export const detailsLimit = 2000

export const searchLimit = 200

export const linksMost = 20

export const tagsMost = 10

export const tagLimit = 40

const title = lazy(() => z.string().trim().min(1).max(titleLimit))

const details = lazy(() => z.string().trim().max(detailsLimit))

const links = lazy(() => z.array(z.string().trim().min(1)).max(linksMost))

const tags = lazy(() =>
  z
    .array(z.string().trim().toLowerCase().min(1).max(tagLimit))
    .max(tagsMost)
    .transform(given => [...new Set(given)]),
)

const project = lazy(() => z.string().min(1).nullable())

export const entryFields = lazy(() => z.object({ project: project(), title: title(), details: details(), links: links(), tags: tags() }))

const author = lazy(() => z.object({ owner: z.enum(['thread', 'bot']), id: z.string(), name: z.string() }).nullable())

const revision = lazy(() =>
  z.union([
    z.object({ id: z.string().min(1), updated: z.number(), removed: z.literal(true) }),
    entryFields().extend({ id: z.string().min(1), at: z.number(), updated: z.number(), author: author() }),
  ]),
)

export const logbookAdd = request('logbook.add', {
  input: () => entryFields().partial({ project: true, details: true, links: true, tags: true }),
  output: type<Entry>(),
  callers: 'any',
})

export const logbookChange = request('logbook.change', {
  input: () => entryFields().partial().extend({ id: z.string() }),
  output: type<Entry>(),
  callers: 'any',
})

export const logbookRemove = request('logbook.remove', { input: () => z.object({ id: z.string() }), output: type<void>(), callers: 'any' })

export const logbookSearch = request('logbook.search', {
  input: () =>
    z.object({
      query: z.string().trim().optional(),
      project: project().optional(),
      tag: z.string().trim().toLowerCase().optional(),
      from: z.number().optional(),
      to: z.number().optional(),
      limit: z.number().int().min(1).max(searchLimit).optional(),
    }),
  output: type<Entry[]>(),
  callers: 'any',
})

export const logbookTags = request('logbook.tags', { input: () => z.object({ project: project().optional() }), output: type<TagUse[]>(), callers: 'any' })

export const logbookExchange = request('logbook.exchange', {
  input: () => z.object({ versions: z.record(z.string(), z.number()) }),
  output: type<Exchanged>(),
  callers: 'pc',
})

export const logbookPut = request('logbook.put', { input: () => z.object({ revisions: z.array(revision()) }), output: type<void>(), callers: 'pc' })

export const logbookChanged = wireEvent<string[]>('logbook.change')
