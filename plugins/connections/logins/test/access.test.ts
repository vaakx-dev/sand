import { botCreate } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loginAdd, loginChange, loginUses } from '../src/contract'
import { botEntries, browser, call, idle, models, plugins, resultText, said, start, threadEntries } from './fixture'

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

const asksEveryTime = (name: string) =>
  `Not used: the login ${name} is set to "Ask me every time", so agents can't use it. Tell the user: they can turn that off in the login's settings (Settings → Logins), or use it themselves.`

test("a bot and its subagents use the bot's logins; any other thread, or anyone once a login asks every time, is refused and told how to allow it", async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-logins-access-'))
  const ids = await setUp()
  const useKey = call('shell', { command: 'echo used', logins: { TOKEN: ids.key } })
  const fillSite = call('login_fill', { login: ids.site })
  const sand = await start(
    [
      [useKey],
      [fillSite],
      [said('Bot used both.')],
      [useKey],
      [said('Subagent used it.')],
      [said('Bot heard back.')],
      [useKey],
      [said('User thread was refused.')],
      [useKey],
      [fillSite],
      [said('Bot was refused.')],
    ],
    { home, plugins: [...plugins, 'bots/bridge'] },
  )
  try {
    const fills = browser(sand)

    await sand.ask(botSend, { bot: ids.bot, prompt: 'Deploy', clientRequestId: 'bot' })
    await idle(sand, ids.bot)
    expect(fills).toEqual([{ site: 'northbank.example', username: 'ana', password: 'bank-password' }])

    const started = await sand.app.get(orchestrator)!.start({
      cwd: home,
      prompt: 'Deploy from a subagent',
      model: 'fake/m',
      origin: 'agent',
      clientRequestId: 'started',
      from: { owner: 'bot', id: ids.bot },
      subagent: { call: 'deploy' },
    })
    if (started.disposition !== 'started') throw new Error('The subagent should run at once')
    expect(await sand.turns.wait(started.turn, 'end')).toMatchObject({ status: 'completed' })
    for (let tries = 0; tries < 500 && sand.requests('fake').length < 6; tries++) await Bun.sleep(10)
    await idle(sand, ids.bot)

    const chat = sand.sessions.require(ids.chat)
    expect(await sand.turns.run(chat, 'Deploy')).toMatchObject({ text: 'User thread was refused.' })
    expect(resultText(threadEntries(sand, chat.id)(), 'shell')).toBe(
      "Not used: the login Deploy key isn't shared with this thread. Tell the user: they can let it use the login in the login's settings (Settings → Logins), or use it themselves.",
    )

    for (const id of [ids.key, ids.site]) await sand.ask(loginChange, { id, ask: true })
    await sand.ask(botSend, { bot: ids.bot, prompt: 'Deploy again', clientRequestId: 'bot-ask' })
    await idle(sand, ids.bot)
    const asked = await botEntries(sand, ids.bot)()
    expect(resultText(asked, 'shell')).toEndWith(asksEveryTime('Deploy key'))
    expect(resultText(asked, 'login_fill')).toEndWith(asksEveryTime('Northbank'))
    expect(fills).toHaveLength(1)

    const uses = await sand.ask(loginUses, { id: ids.key })
    expect(uses).toEqual([
      { login: ids.key, at: expect.any(Number), action: 'env', owner: 'thread', conversation: started.thread, title: expect.any(String), bot: ids.bot, grant: 'bot' },
      { login: ids.key, at: expect.any(Number), action: 'env', owner: 'bot', conversation: ids.bot, title: 'Deployer', bot: ids.bot, grant: 'bot' },
    ])
    expect(await sand.ask(loginUses, { id: ids.site })).toEqual([
      { login: ids.site, at: expect.any(Number), action: 'fill', owner: 'bot', conversation: ids.bot, title: 'Deployer', bot: ids.bot, site: 'northbank.example', grant: 'bot' },
    ])
  } finally {
    await sand.stop()
  }
})
