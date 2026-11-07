import { botConversation, botGet } from '@sand/bots/contract'
import type { Computer, Fill, Filled } from '@sand/computers/contract'
import { computers } from '@sand/computers/contract'
import { type SandOptions, startSand } from '@sand/harness'
import type { Request } from '@sand/host-hub/contract'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { z } from 'zod'
import { askWaiting } from '../src/contract'

Bun.env.SAND_KEYCHAIN = 'off'

export const said = (text: string) => ({ type: 'text', text }) as const

export const call = (name: string, input: Record<string, unknown> = {}) => ({ type: 'call', name, input }) as const

export const plugins = ['connections/logins', 'agent/shell', 'agent/approvals', 'computer/computers', 'bots/bots', 'bots/memory', 'bots/turns']

export const start = (replies: Source['replies'], options: SandOptions = {}) =>
  startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], { plugins, ...options })

export type Sand = Awaited<ReturnType<typeof start>>

export const models = { main: { model: 'fake/m' }, quick: {} }

export const browser = (sand: Sand) => {
  const fills: Fill[] = []
  const computer: Computer = {
    info: { id: 'browser', kind: 'browser', label: 'Browser', os: 'windows' },
    screenshot: () => Promise.reject(new Error('No screen in tests')),
    elements: async () => [],
    act: async () => {},
    settle: async () => {},
    async fill(fill) {
      fills.push(fill)
      return (['username', 'password', 'code'] as const).filter((field): field is Filled => fill[field] !== undefined)
    },
  }
  sand.app.get(computers)!.register(computer)
  sand.app.get(tools)!.register({
    name: 'page',
    description: 'Read the page',
    effect: 'read',
    input: z.object({}),
    run: () => fills.map(fill => JSON.stringify(fill)).join('\n'),
  })
  return fills
}

const until = async <T>(found: () => Promise<T | undefined> | T | undefined, what: string) => {
  for (let tries = 0; tries < 1000; tries++) {
    const value = await found()
    if (value !== undefined) return value
    await Bun.sleep(10)
  }
  throw new Error(`Timed out waiting for ${what}`)
}

type Entries = () => Promise<{ type: string; data: unknown }[]> | { type: string; data: unknown }[]

export const threadEntries = (sand: Sand, id: string) => () => sand.sessions.require(id).path()

export const botEntries = (sand: Sand, bot: string) => async () => (await sand.ask(botConversation, { bot, limit: 500 })).entries

export const answer = async <I>(sand: Sand, session: string, entries: Entries, type: string, request: Request<I, unknown>, reply: (id: string) => I) => {
  const id = await until(async () => {
    const asked = (await entries()).findLast(entry => entry.type === type)?.data as { id: string } | undefined
    return asked && (await sand.ask(askWaiting, { session, id: asked.id })) ? asked.id : undefined
  }, type)
  await sand.ask(request, reply(id))
}

export const idle = (sand: Sand, bot: string) =>
  until(async () => {
    const found = await sand.ask(botGet, { bot })
    return found?.status === 'idle' && found.last?.role === 'assistant' ? found : undefined
  }, `bot ${bot} to finish`)
