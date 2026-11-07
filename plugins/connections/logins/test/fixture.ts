import { botConversation, botGet } from '@sand/bots/contract'
import { type Message, textOf } from '@sand/chats/contract'
import type { Computer, Fill, Filled } from '@sand/computers/contract'
import { computers } from '@sand/computers/contract'
import { type SandOptions, startSand } from '@sand/harness'
import type { Request } from '@sand/host-hub/contract'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
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

type Values = Record<string, string>

const forms = (value: string) => {
  const shifted = [0, 1, 2].map(pad => Buffer.concat([Buffer.alloc(pad), Buffer.from(value)]).toString('base64').slice(pad ? 4 : 0, -4))
  return [value, value.toLowerCase(), ...shifted].map(text => Buffer.from(text)).concat(Buffer.from(value, 'utf16le'))
}

export const leaksIn = async (home: string, values: Values) => {
  const entries = await readdir(home, { withFileTypes: true, recursive: true })
  const found: string[] = []
  for (const entry of entries.filter(item => item.isFile())) {
    const path = join(entry.parentPath, entry.name)
    const bytes = Buffer.from(await Bun.file(path).arrayBuffer())
    for (const [name, value] of Object.entries(values)) if (forms(value).some(form => bytes.includes(form))) found.push(`${name} in ${path}`)
  }
  return { files: entries.filter(item => item.isFile()).map(item => item.name), found }
}

export const leaksInText = (text: string, codes: string[], values: Values) => [
  ...Object.entries(values).flatMap(([name, value]) => (text.toLowerCase().includes(value.toLowerCase()) ? [name] : [])),
  ...codes.filter(code => new RegExp(`(?<!\\d)${code}(?!\\d)`).test(text)).map(code => `totp code ${code}`),
]

export const resultText = (entries: { type: string; data: unknown }[], tool: string) => {
  const blocks = entries.flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content : []))
  const ids = new Set(blocks.flatMap(block => (block.type === 'tool_call' && block.name === tool ? [block.id] : [])))
  return blocks.flatMap(block => (block.type === 'tool_result' && ids.has(block.callId) ? [textOf(block.content)] : [])).join('\n')
}

export const idle = (sand: Sand, bot: string) =>
  until(async () => {
    const found = await sand.ask(botGet, { bot })
    return found?.status === 'idle' && found.last?.role === 'assistant' ? found : undefined
  }, `bot ${bot} to finish`)
