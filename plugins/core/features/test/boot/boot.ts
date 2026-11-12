import { llm } from '@sand/accounts/contract'
import { botList, bots } from '@sand/bots/contract'
import { calendars } from '@sand/calendar/contract'
import { sessions } from '@sand/chats/contract'
import { computers } from '@sand/computers/contract'
import { connections } from '@sand/connections/contract'
import { engine } from '@sand/engine/contract'
import { gitRepo } from '@sand/git/contract'
import { gitRunner } from '@sand/git-runner/contract'
import { startSand } from '@sand/harness'
import { htmlPages } from '@sand/html/contract'
import { schedules } from '@sand/schedules/contract'
import { tools } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import type { Service } from 'drydock'

const core = ['threads', 'bots', 'phone', 'notifications', 'updates']

const addons = ['git', 'terminal', 'calendar', 'connections', 'logins', 'computers', 'bot-watches', 'logbook', 'guesses', 'stash', 'math', 'mcp', 'pcs', 'outside']

const topLevel = [...core, ...addons]

export const model = { id: 'fake', models: ['m'], replies: [[{ type: 'text' as const, text: 'Hello from the bot' }]] }

const watched = { sessions, bots, calendars, computers, engine, llm, tools, schedules, connections, gitRepo, gitRunner, htmlPages }

type Name = keyof typeof watched

export const boot = (on: string[], off: string[] = [], sources: Parameters<typeof startSand>[0] = on.some(id => ['threads', 'bots', 'computers'].includes(id)) ? [model] : []) => {
  const lines = [...new Set([...topLevel.filter(id => !on.includes(id)), ...off])].map(id => `${id} = false`)
  return startSand(sources, { config: `[features]\n${lines.join('\n')}` })
}

export type Booted = Awaited<ReturnType<typeof boot>>

export const running = (sand: Booted) => Object.entries(watched).flatMap(([name, token]) => (sand.app.get(token as Service<unknown>) ? [name as Name] : []))

export const fresh = () => startSand([model], { config: '' })

export const combinations = (list: [string, string[], string[], Name[]][]) => {
  for (const [name, on, off, expected] of list)
    test(`${name}: every plugin that is on starts, and only what is needed runs`, async () => {
      const sand = await boot(on, off)
      try {
        expect(sand.problems()).toEqual([])
        expect(running(sand)).toEqual(expected)
      } finally {
        await sand.stop()
      }
    })
}

export const answer = async (sand: Booted, bot: string) => {
  for (let tries = 0; tries < 200; tries++) {
    const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
    if (found?.status === 'idle' && found.last?.role === 'assistant') return found.last.text
    await Bun.sleep(10)
  }
}
