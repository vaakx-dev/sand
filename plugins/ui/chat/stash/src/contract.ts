import { promptInput, type UserContent } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

const content = z.custom<UserContent>(value => promptInput.safeParse([value]).success, 'Expected attached content')

export const stashed = z.object({ text: z.string(), content: z.array(content), chat: z.string() })

export const entry = stashed.extend({ id: z.string(), at: z.number() })

export type Entry = z.output<typeof entry>

export const stashList = request('stash.list', { input: z.object({}), output: type<Entry[]>() })

export const stashAdd = request('stash.add', { input: stashed, output: type<Entry>() })

export const stashRemove = request('stash.remove', { input: z.object({ id: z.string() }), output: type<void>() })

export const stashChange = wireEvent<Entry[]>('stash.change')
