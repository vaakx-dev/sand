import { approvalAsked, approvals, type Decision } from '@sand/approvals/contract'
import { botCreate } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loginAdd, loginChange, loginUses } from '../src/contract'
import { browser, call, idle, models, plugins, said, type Sand, start } from './fixture'

let home: string

afterEach(() => rmSync(home, { recursive: true, force: true }))

const setUp = async () => {
  const sand = await start([], { home })
  const bot = await sand.ask(botCreate, { name: 'Deployer', models })
  const key = await sand.ask(loginAdd, { kind: 'key', name: 'Deploy key', value: 'deploy-key-value' })
  const site = await sand.ask(loginAdd, { kind: 'website', name: 'Northbank', site: 'northbank.example', username: 'ana', password: 'bank-password' })
  for (const login of [key, site]) await sand.ask(loginChange, { id: login.id, bots: [bot.id] })
  const chat = sand.chat('fake/m')
  await sand.stop()
  return { bot: bot.id, key: key.id, site: site.id, chat: chat.id }
}

const asks = (sand: Sand) => {
  const asked: Decision[] = []
  sand.app.on(approvalAsked, decision => void asked.push(decision))
  return asked
}

const answered = async (asked: Decision[], count: number) => {
  for (let tries = 0; tries < 500 && asked.length < count; tries++) await Bun.sleep(10)
  return asked[count - 1]!
}

test("a bot and the threads it starts use the bot's logins freely; anyone else, or ask: true, asks once each time; a deny rule wins", async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-logins-access-'))
  const ids = await setUp()
  const useKey = call('shell', { command: 'echo used', logins: { TOKEN: ids.key } })
  const sand = await start(
    [
      [useKey],
      [call('login_fill', { login: ids.site })],
      [said('Bot used both.')],
      [useKey],
      [said('Started thread used it.')],
      [said('Bot heard back.')],
      [useKey],
      [said('User thread used it.')],
      [useKey],
      [said('Bot asked.')],
      [useKey],
      [said('Bot was denied.')],
    ],
    { home, plugins: [...plugins, 'bots/bridge'] },
  )
  try {
    const fills = browser(sand)
    const asked = asks(sand)
    const gate = sand.app.get(approvals)!

    await sand.ask(botSend, { bot: ids.bot, prompt: 'Deploy', clientRequestId: 'bot' })
    await idle(sand, ids.bot)
    expect(fills).toEqual([{ site: 'northbank.example', username: 'ana', password: 'bank-password' }])

    const started = await sand.app.get(orchestrator)!.start({
      cwd: home,
      prompt: 'Deploy from a thread',
      model: 'fake/m',
      origin: 'agent',
      clientRequestId: 'started',
      from: { owner: 'bot', id: ids.bot },
    })
    if (started.disposition !== 'started') throw new Error('The started thread should run at once')
    expect(await sand.turns.wait(started.turn, 'end')).toMatchObject({ status: 'completed' })
    for (let tries = 0; tries < 500 && sand.requests('fake').length < 6; tries++) await Bun.sleep(10)
    await idle(sand, ids.bot)
    expect(asked).toEqual([])

    const chat = sand.sessions.require(ids.chat)
    const user = sand.turns.run(chat, 'Deploy')
    const decision = await answered(asked, 1)
    expect(decision).toMatchObject({ owner: 'thread', conversation: chat.id, tool: 'shell', once: true, summary: 'With logins Deploy key: echo used' })
    gate.answer(decision.id, 'always')
    expect(await user).toMatchObject({ text: 'User thread used it.' })
    expect(gate.rules()).toEqual([])

    await sand.ask(loginChange, { id: ids.key, ask: true })
    await sand.ask(botSend, { bot: ids.bot, prompt: 'Deploy again', clientRequestId: 'bot-ask' })
    const askedBot = await answered(asked, 2)
    expect(askedBot).toMatchObject({ owner: 'bot', conversation: ids.bot, once: true })
    gate.answer(askedBot.id, 'once')
    await idle(sand, ids.bot)

    await sand.ask(loginChange, { id: ids.key, ask: false })
    gate.addRule({ owner: 'bot', tool: 'shell', verdict: 'deny' })
    await sand.ask(botSend, { bot: ids.bot, prompt: 'Deploy once more', clientRequestId: 'bot-deny' })
    await idle(sand, ids.bot)
    expect(asked).toHaveLength(2)
    expect(gate.decisions({ conversation: ids.bot })[0]).toMatchObject({ tool: 'shell', outcome: 'denied', by: 'rule' })

    const uses = await sand.ask(loginUses, { id: ids.key })
    expect(uses).toEqual([
      { login: ids.key, at: expect.any(Number), action: 'env', owner: 'bot', conversation: ids.bot, title: 'Deployer', bot: ids.bot, grant: 'user' },
      { login: ids.key, at: expect.any(Number), action: 'env', owner: 'thread', conversation: chat.id, title: expect.any(String), grant: 'user' },
      { login: ids.key, at: expect.any(Number), action: 'env', owner: 'thread', conversation: started.thread, title: expect.any(String), bot: ids.bot, grant: 'bot' },
      { login: ids.key, at: expect.any(Number), action: 'env', owner: 'bot', conversation: ids.bot, title: 'Deployer', bot: ids.bot, grant: 'bot' },
    ])
    expect(uses.map(use => use.at)).toEqual(uses.map(use => use.at).toSorted((a, b) => b - a))
    expect(await sand.ask(loginUses, { id: ids.site })).toEqual([
      { login: ids.site, at: expect.any(Number), action: 'fill', owner: 'bot', conversation: ids.bot, title: 'Deployer', bot: ids.bot, site: 'northbank.example', grant: 'bot' },
    ])
  } finally {
    await sand.stop()
  }
}, 30_000)
