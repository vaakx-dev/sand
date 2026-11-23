import { botCreate, botList, botUpdate, type Computer } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import { type Need, tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const needing: Record<string, Need[]> = { memory: [], read: ['folder'], logbook_add: ['folder'], pc_list: ['pc'], skill: ['computer'], shell: ['computer'], thread_list: ['thread'] }

const offeredWith = async (computers: Computer[]) => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: computers.map(() => [said('ok')]) }], {
    plugins: ['bots/bots', 'bots/turns'],
  })
  for (const [name, needs] of Object.entries(needing)) sand.app.get(tools)!.register({ name, description: name, needs, input: z.object({}), run: () => name })
  const bot = await sand.ask(botCreate, { name: 'Helper' })
  for (const [at, computer] of computers.entries()) {
    await sand.ask(botUpdate, { bot: bot.id, patch: { computer } })
    await sand.turns.send(sand.sessions.require(bot.id), { prompt: computer, clientRequestId: computer })
    for (let tries = 0; tries < 200 && sand.requests('fake').length <= at; tries++) await Bun.sleep(10)
    for (let tries = 0; tries < 200 && (await sand.ask(botList, {})).find(listed => listed.id === bot.id)?.status !== 'idle'; tries++) await Bun.sleep(10)
  }
  return sand.requests('fake').map(body => (JSON.parse(body).tools as { name: string }[]).map(tool => tool.name))
}

test('a bot gets the tools a thread gets, whatever its computer', async () => {
  const offered = await offeredWith(['none', 'own', 'this-pc', 'pc:laptop'])

  const ours = (names: string[]) => names.filter(name => name in needing).sort()
  for (const names of offered) expect(ours(names)).toEqual(['logbook_add', 'memory', 'pc_list', 'read', 'shell', 'skill', 'thread_list'])
})
