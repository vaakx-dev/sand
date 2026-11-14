import { type Message, type Session, textOf } from '@sand/chats/contract'
import { checksSettled, github, type GitHub } from '@sand/github/contract'
import { startSand, type Sand } from '@sand/harness'
import { pullFollow, pullFollows, pullUnfollow } from '@sand/pull-watch/contract'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const SHA = 'abc1234def5678'

const fakeGitHub = () => {
  const repo = { ci: { status: 'in_progress', conclusion: null as string | null }, comments: [] as object[] }
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
    if (path.includes('/issues/7/comments')) return repo.comments
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

const start = async (replies: Reply[]) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies }], {
    plugins: ['automation/watches', 'git/pull-watch'],
    options: { watches: { debounce_ms: 20 }, 'pull-watch': { poll_ms: 20 } },
  })
  const fake = fakeGitHub()
  sand.app.provide(github, fake.service)
  await sand.app.settled()
  return fake
}

const comment = { id: 30, user: { login: 'jon' }, body: 'Please also cover retries.', html_url: 'https://github.com/acme/tiles/pull/7#issuecomment-30', created_at: new Date().toISOString() }

const lastSaid = (chat: Session, text: string) => chat.messages().at(-1)?.content.some(block => block.type === 'text' && block.text === text) ?? false

test('a thread follows the PR it opens, and wakes to deal with its failed CI', async () => {
  const fake = await start([[{ type: 'call', name: 'open_pr', input: {} }], [said('Opened it.')], [said('Fixing the e2e test.')]])
  sand.tool('open_pr', () => 'Opened https://github.com/acme/tiles/pull/7, like https://github.com/acme/tiles/pull/3 before it')
  const chat = sand.chat('fake/m')

  await sand.turns.run(chat, 'Open a PR for this')
  await until(async () => (await sand.ask(pullFollows, { thread: chat.id })).length === 1)
  expect(await sand.ask(pullFollows, { thread: chat.id })).toMatchObject([{ repo: 'acme/tiles', number: 7, title: 'Change 7' }])

  fake.repo.ci = { status: 'completed', conclusion: 'failure' }
  await until(() => lastSaid(chat, 'Fixing the e2e test.'))
  const wake = userTexts(chat.messages()).at(-1)
  expect(wake).toContain('<label>PR #7 · CI failed: e2e</label>')
  expect(wake).toContain('e2e: https://ci.example.com/e2e')

  expect(await sand.ask(pullUnfollow, { thread: chat.id, pull: 'acme/tiles#7' })).toBe(true)
  expect(await sand.ask(pullFollows, { thread: chat.id })).toEqual([])
})

test('a change that lands while the thread works reaches its running turn, and CI it already saw finish wakes it for nothing', async () => {
  const fake = await start([[{ type: 'call', name: 'push_fix', input: {} }], [said('Saw the comment too.')], [said('Covered retries.')]])
  const chat = sand.chat('fake/m')
  await sand.ask(pullFollow, { thread: chat.id, pull: 'https://github.com/acme/tiles/pull/7' })
  sand.tool('push_fix', async () => {
    fake.repo.comments = [comment]
    await until(() => sand.turns.pending(chat).length > 0)
    return 'Pushed.'
  })

  await sand.turns.run(chat, 'Fix the upload retries')

  expect(sand.turns.list(chat)).toHaveLength(1)
  expect(userTexts(chat.messages()).some(text => text.includes('<label>PR #7 · jon commented</label>'))).toBe(true)

  sand.app.emit(checksSettled, chat.id, SHA, 'passed')
  fake.repo.ci = { status: 'completed', conclusion: 'success' }
  await Bun.sleep(200)
  fake.repo.comments = [comment, { ...comment, id: 31, body: 'Thanks!' }]
  await until(() => lastSaid(chat, 'Covered retries.'))
  expect(sand.turns.list(chat)).toHaveLength(2)
  expect(userTexts(chat.messages()).at(-1)).not.toContain('CI passed')
})
