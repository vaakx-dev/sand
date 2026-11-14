import { type Message, textOf } from '@sand/chats/contract'
import { github, type GitHub } from '@sand/github/contract'
import { startSand, type Sand } from '@sand/harness'
import { pullFollows, pullUnfollow } from '@sand/pull-watch/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const SHA = 'abc1234def5678'

const fakeGitHub = () => {
  const repo = { ci: { status: 'in_progress', conclusion: null as string | null } }
  const pull = (number: number, created: string) => ({
    title: `Change ${number}`,
    state: 'open',
    merged: false,
    mergeable: true,
    html_url: `https://github.com/acme/tiles/pull/${number}`,
    head: { sha: SHA },
    base: { ref: 'main' },
    created_at: created,
  })
  const answers = (path: string): unknown => {
    if (path === '/repos/acme/tiles/pulls/7') return pull(7, new Date().toISOString())
    if (path === '/repos/acme/tiles/pulls/3') return pull(3, '2020-01-01T00:00:00Z')
    if (path.includes('/check-runs')) return { check_runs: [{ name: 'e2e', html_url: 'https://ci.example.com/e2e', details_url: null, ...repo.ci }] }
    if (path.includes('/status')) return { statuses: [] }
    return []
  }
  const service: GitHub = {
    rest: async <T>(_method: string, path: string) => answers(path) as T,
    async *changes() {},
  }
  return { repo, service }
}

const until = async (done: () => boolean | Promise<boolean>) => {
  for (let tries = 0; tries < 500 && !(await done()); tries++) await Bun.sleep(10)
  expect(await done()).toBe(true)
}

const userTexts = (messages: Message[]) => messages.filter(message => message.role === 'user').map(message => textOf(message.content))

test('a thread follows the PR it opens, and wakes to deal with its failed CI', async () => {
  sand = await startSand(
    [{ id: 'fake', models: ['m'], replies: [[{ type: 'call', name: 'open_pr' }], [said('Opened it.')], [said('Fixing the e2e test.')]] }],
    { plugins: ['automation/watches', 'git/pull-watch'], options: { watches: { debounce_ms: 20 }, 'pull-watch': { poll_ms: 20 } } },
  )
  const fake = fakeGitHub()
  sand.app.provide(github, fake.service)
  sand.tool('open_pr', () => 'Opened https://github.com/acme/tiles/pull/7, like https://github.com/acme/tiles/pull/3 before it')
  const chat = sand.chat('fake/m')

  await sand.turns.run(chat, 'Open a PR for this')
  await until(async () => (await sand.ask(pullFollows, { thread: chat.id })).length === 1)
  expect(await sand.ask(pullFollows, { thread: chat.id })).toMatchObject([{ repo: 'acme/tiles', number: 7, title: 'Change 7' }])

  fake.repo.ci = { status: 'completed', conclusion: 'failure' }
  await until(() => chat.messages().at(-1)?.content.some(block => block.type === 'text' && block.text === 'Fixing the e2e test.') ?? false)
  const wake = userTexts(chat.messages()).at(-1)
  expect(wake).toContain('CI failed on abc1234: e2e')
  expect(wake).toContain('e2e: https://ci.example.com/e2e')

  expect(await sand.ask(pullUnfollow, { thread: chat.id, pull: 'acme/tiles#7' })).toBe(true)
  expect(await sand.ask(pullFollows, { thread: chat.id })).toEqual([])
})
