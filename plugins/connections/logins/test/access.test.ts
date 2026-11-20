import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loginAdd, loginChange, loginUses } from '../src/contract'
import { browser, call, chatEntries, delegate, heardBack, newBot, resultText, said, start, tellBot } from './fixture'

let home: string

afterEach(() => rmSync(home, { recursive: true, force: true }))

const setUp = async () => {
  const sand = await start([], { home })
  const bot = await newBot(sand, 'Deployer')
  const key = await sand.ask(loginAdd, { kind: 'key', name: 'Deploy key', value: 'deploy-key-value' })
  const site = await sand.ask(loginAdd, { kind: 'website', name: 'Northbank', site: 'northbank.example', username: 'ana', password: 'bank-password' })
  for (const login of [key, site]) await sand.ask(loginChange, { id: login.id, bots: [bot.id] })
  const chat = sand.chat('fake/m')
  await sand.stop()
  return { bot: bot.id, key: key.id, site: site.id, chat: chat.id }
}

const asksEveryTime = (name: string) =>
  `Not used: the login ${name} is set to "Ask me every time", so agents can't use it. Tell the user: they can turn that off in the login's settings (Settings → Logins), or use it themselves.`

test("a bot's subagents use the bot's logins and the bot itself can't; any other thread, or anyone once a login asks every time, is refused and told how to allow it", async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-logins-access-'))
  const ids = await setUp()
  const useKey = call('shell', { command: 'echo used', logins: { TOKEN: ids.key } })
  const fillSite = call('login_fill', { login: ids.site })
  const sand = await start(
    [
      [delegate('Deploy')],
      [said('Started it.')],
      [said('Subagent used both.')],
      [useKey],
      [said('User thread was refused.')],
      [delegate('Deploy again')],
      [said('Started again.')],
      [said('Subagent was refused.')],
    ],
    { home },
    [[useKey], [fillSite], [said('Used both.')], [useKey], [fillSite], [said('Was refused.')]],
  )
  try {
    const fills = browser(sand)
    const bot = sand.sessions.require(ids.bot)
    expect(sand.app.get(tools)!.names(bot)).not.toContain('shell')
    expect(sand.app.get(tools)!.names(bot)).not.toContain('login_fill')

    await tellBot(sand, ids.bot, 'Deploy')
    await heardBack(sand, ids.bot, 'Subagent used both.')
    expect(fills).toEqual([{ site: 'northbank.example', username: 'ana', password: 'bank-password' }])

    const chat = sand.sessions.require(ids.chat)
    expect(await sand.turns.run(chat, 'Deploy')).toMatchObject({ text: 'User thread was refused.' })
    expect(resultText(chatEntries(sand, chat.id)(), 'shell')).toBe(
      "Not used: the login Deploy key isn't shared with this thread. Tell the user: they can let it use the login in the login's settings (Settings → Logins), or use it themselves.",
    )

    for (const id of [ids.key, ids.site]) await sand.ask(loginChange, { id, ask: true })
    await tellBot(sand, ids.bot, 'Deploy again')
    await heardBack(sand, ids.bot, 'Subagent was refused.')
    const [first, second] = sand.sessions.children(ids.bot)
    const asked = chatEntries(sand, second!.id)()
    expect(resultText(asked, 'shell')).toEndWith(asksEveryTime('Deploy key'))
    expect(resultText(asked, 'login_fill')).toEndWith(asksEveryTime('Northbank'))
    expect(fills).toHaveLength(1)

    expect(await sand.ask(loginUses, { id: ids.key })).toEqual([
      { login: ids.key, at: expect.any(Number), action: 'env', owner: 'thread', conversation: first!.id, title: expect.any(String), bot: ids.bot, grant: 'bot' },
    ])
    expect(await sand.ask(loginUses, { id: ids.site })).toEqual([
      { login: ids.site, at: expect.any(Number), action: 'fill', owner: 'thread', conversation: first!.id, title: expect.any(String), bot: ids.bot, site: 'northbank.example', grant: 'bot' },
    ])
  } finally {
    await sand.stop()
  }
})
