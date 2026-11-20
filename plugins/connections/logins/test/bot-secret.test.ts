import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { answerEntry, loginsState, secretEntry, secretSave } from '../src/contract'
import { agentOf, answer, call, chatEntries, delegate, heardBack, leaksIn, leaksInText, newBot, resultText, said, start, tellBot } from './fixture'

let folders: string[] = []

afterEach(() => {
  for (const made of folders) rmSync(made, { recursive: true, force: true })
  folders = []
})

const folder = () => {
  const made = mkdtempSync(join(tmpdir(), 'sand-logins-bot-secret-'))
  folders.push(made)
  return made
}

const token = `rs_bot_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}_Typed`

const script = `const { TOKEN = '' } = process.env
await Bun.write(import.meta.dir + '/env.txt', new Bun.CryptoHasher('sha256').update(TOKEN).digest('hex'))
console.log('token=' + TOKEN)
`

test("a bot asks the user for a typed secret, which its agent then uses without the value reaching the model, a transcript or a file", async () => {
  const home = folder()
  const work = folder()
  await Bun.write(join(work, 'print.ts'), script)
  const logins: Record<string, string> = {}
  const sand = await start(
    [
      [call('request_secret', { title: 'Deploy token', reason: 'To deploy', once: false })],
      [delegate('Deploy with the Deploy token')],
      [said('Started it.')],
      [said('Deployed.')],
    ],
    { home },
    [[call('saved_login')], [call('shell', { command: `bun ${join(work, 'print.ts').replaceAll('\\', '/')}`, logins })], [said('Deployed with the token.')]],
  )
  try {
    const bot = await newBot(sand, 'Deployer')
    expect(sand.app.get(tools)!.names(sand.sessions.require(bot.id))).toContain('request_secret')
    const botChat = chatEntries(sand, bot.id)
    sand.app.get(tools)!.register({
      name: 'saved_login',
      description: 'Find the login the bot saved',
      effect: 'read',
      input: z.object({}),
      run() {
        logins.TOKEN = (botChat().findLast(entry => entry.type === answerEntry)?.data as { login: string }).login
        return logins.TOKEN
      },
    })
    await tellBot(sand, bot.id, 'Deploy the site')
    await answer(sand, bot.id, botChat, secretEntry, secretSave, id => ({ session: bot.id, id, save: true, value: token }))

    const agent = chatEntries(sand, await agentOf(sand, bot.id))
    await heardBack(sand, bot.id, 'Deployed.')
    expect((await sand.ask(loginsState, {})).logins.find(login => login.id === logins.TOKEN)).toMatchObject({ bots: [bot.id], threads: [] })
    expect(await Bun.file(join(work, 'env.txt')).text()).toBe(new Bun.CryptoHasher('sha256').update(token).digest('hex'))
    expect(resultText(agent(), 'shell')).toContain('token=[secret: Deploy token]')

    const values = { token }
    for (const entries of [botChat(), agent()]) expect(leaksInText(JSON.stringify(entries), [], values)).toEqual([])
    expect([...sand.requests('fake'), ...sand.requests('aide')].flatMap(body => leaksInText(body, [], values))).toEqual([])
    expect((await leaksIn(home, values)).found).toEqual([])
  } finally {
    await sand.stop()
  }
})

