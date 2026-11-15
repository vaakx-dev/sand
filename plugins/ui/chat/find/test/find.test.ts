import type { Message } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { chatFind } from '../src/contract'

let running: Sand | undefined

afterEach(async () => {
  await running?.stop()
  running = undefined
})

const start = async () => {
  running = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [] }], { plugins: ['ui/chat/find'] })
  return running
}

const said = (text: string): Message => ({ role: 'user', content: [{ type: 'text', text }] })

const answered = (...content: Message['content']): Message => ({ role: 'assistant', content })

test("a thread's older history gives where the words are on its current branch, in order, counted in the text the chat shows", async () => {
  const sand = await start()
  const session = sand.sessions.thread(sand.home)
  const asked = session.append('message', said('Why does the Tile renderer flicker?'))
  const thought = session.append('message', answered({ type: 'thinking', thinking: 'The tile cache, probably.' }, { type: 'text', text: 'The [tile cache](https://tile.example/tile) keys on zoom, so each **tile** loads twice.' }))
  const dropped = session.append('message', said('Forget the tile, look at fonts.'))
  session.checkout(thought.id)
  const followed = session.append('message', said('Does the fix cost memory per tíle?'))
  const loaded = session.append('message', answered({ type: 'text', text: 'About 12% more tiles.' }))

  const find = (before?: string) => sand.ask(chatFind, { owner: 'thread', chat: session.id, query: 'TILE', before })

  expect(await find(loaded.id)).toEqual([
    { entry: asked.id, block: 0, count: 1 },
    { entry: thought.id, block: 1, count: 2 },
    { entry: followed.id, block: 0, count: 1 },
  ])
  expect(await find(followed.id)).toEqual([
    { entry: asked.id, block: 0, count: 1 },
    { entry: thought.id, block: 1, count: 2 },
  ])
  expect((await find()).map(found => found.entry)).toEqual([asked.id, thought.id, followed.id, loaded.id])
  expect((await find(dropped.id))).toEqual([])
})
