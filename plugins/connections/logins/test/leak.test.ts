import type { Fill } from '@sand/computers/contract'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { codeAnswer, codeEntry, loginAdd, loginChange, secretEntry, secretSave } from '../src/contract'
import { totpCode } from '../src/totp'
import { agentOf, answer, browser, call, chatEntries, delegate, heardBack, leaksIn, leaksInText, newBot, plugins, resultText, said, type Sand, start, tellBot } from './fixture'

let folders: string[] = []

afterEach(() => {
  for (const made of folders) rmSync(made, { recursive: true, force: true })
  folders = []
})

const folder = () => {
  const made = mkdtempSync(join(tmpdir(), 'sand-logins-'))
  folders.push(made)
  return made
}

const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const tag = crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const values = {
  username: `ana.${tag}@example.com`,
  password: `Pw-${tag}-hunter2-zebra`,
  key: `sk_live_${tag}_KeyValue42`,
  totp: Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => base32[byte % 32]).join(''),
  shopUsername: `bob.${tag}@example.org`,
  shopPassword: `Shop-${tag}-Pass99`,
  threadSecret: `rs_thread_${tag}_Fresh`,
  threadCode: `TC${tag.toUpperCase()}`,
  agentCode: `AC${tag.toUpperCase()}`,
}

const sha = (text: string) => new Bun.CryptoHasher('sha256').update(text).digest('hex')

const script = `const hash = text => new Bun.CryptoHasher('sha256').update(text).digest('hex')
const { TOKEN = '', USER = '', PASS = '' } = process.env
await Bun.write(import.meta.dir + '/env-' + process.argv[2] + '.json', JSON.stringify({ TOKEN: hash(TOKEN), USER: hash(USER), PASS: hash(PASS) }))
console.log('token=' + TOKEN + ' user=' + USER + ' pass=' + PASS)
for (const [name, value] of Object.entries(process.env)) console.log(name + '=' + value)
console.error('stderr ' + TOKEN)
`

interface Ids {
  key: string
  bank: string
  shop: string
  bot: string
  chat: string
}

const setUp = async (home: string) => {
  const sand = await start([], { home })
  const key = await sand.ask(loginAdd, { kind: 'key', name: 'Deploy key', value: values.key })
  const bank = await sand.ask(loginAdd, {
    kind: 'website',
    name: 'Northbank',
    site: 'https://northbank.example/login',
    username: values.username,
    password: values.password,
    totp: `otpauth://totp/Northbank:ana?secret=${values.totp.toLowerCase()}&issuer=Northbank`,
  })
  const shop = await sand.ask(loginAdd, { kind: 'website', name: 'Shop', site: 'shop.example', username: values.shopUsername, password: values.shopPassword })
  const bot = await newBot(sand, 'Banker')
  const chat = sand.chat('fake/m')
  for (const login of [key, bank, shop]) await sand.ask(loginChange, { id: login.id, threads: [chat.id], bots: [bot.id] })
  await sand.stop()
  return { key: key.id, bank: bank.id, shop: shop.id, bot: bot.id, chat: chat.id }
}

const overflow = { type: 'error', message: 'prompt is too long' } as const

const askSecret = [call('request_secret', { title: 'thread deploy token', reason: 'To deploy', once: false })]

const signIn = (ids: Ids, work: string, who: string): Reply[] => [
  [call('login_list')],
  [call('shell', { command: `bun ${join(work, 'print.ts').replaceAll('\\', '/')} ${who}`, logins: { TOKEN: ids.key, USER: `${ids.bank}/username`, PASS: ids.bank } })],
  [call('fails')],
  [call('login_fill', { login: ids.bank })],
  [call('login_code', { login: ids.bank, prompt: 'Enter the code from your app' })],
  [call('login_fill', { login: ids.shop })],
  [call('login_code', { login: ids.shop, prompt: 'Enter the code we texted' })],
  [call('page')],
  [said(`${who} signed in.`)],
]

const failing = (sand: Sand) =>
  sand.app.get(tools)!.register({
    name: 'fails',
    description: 'Fails',
    effect: 'read',
    input: z.object({}),
    run() {
      throw new Error(`Rejected ${values.key} for ${values.username}:${values.password}, then ${values.threadSecret}`)
    },
  })

const expectedFills = (code: string, totp: string): Fill[] => [
  { site: 'northbank.example', username: values.username, password: values.password },
  { site: 'northbank.example', code: totp },
  { site: 'shop.example', username: values.shopUsername, password: values.shopPassword },
  { site: 'shop.example', code },
]

test('no saved value, typed secret or code reaches the model, a transcript, compaction, bot memory or any file in the home', async () => {
  const home = folder()
  const work = folder()
  await Bun.write(join(work, 'print.ts'), script)
  const ids = await setUp(home)
  const sand = await start(
    [
      askSecret,
      ...signIn(ids, work, 'thread'),
      [overflow],
      [said('Thread summary.')],
      [said('Thread carried on.')],
      [delegate('Sign in to the bank and the shop')],
      [said('Started it.')],
      [said('Agent signed in.')],
      [overflow],
      [said('<summary>Bot summary.</summary>\n<memory>\n## The user\n- Banks at Northbank\n</memory>')],
      [said('Bot carried on.')],
    ],
    { home, plugins: [...plugins, 'agent/usage', 'agent/mcp-server', 'agent/logins-mcp'] },
    signIn(ids, work, 'agent'),
  )
  let stopped = false
  try {
    const fills = browser(sand)
    failing(sand)
    const codes = [totpCode(values.totp)]

    const chat = sand.sessions.require(ids.chat)
    const thread = chatEntries(sand, chat.id)
    const ran = sand.turns.run(chat, 'Sign in to the bank and the shop')
    await answer(sand, chat.id, thread, secretEntry, secretSave, id => ({ session: chat.id, id, save: true, value: values.threadSecret }))
    await answer(sand, chat.id, thread, codeEntry, codeAnswer, id => ({ session: chat.id, id, code: ` ${values.threadCode} ` }))
    expect(await ran).toMatchObject({ text: 'thread signed in.' })
    expect(await sand.turns.run(chat, 'Carry on')).toMatchObject({ text: 'Thread carried on.' })
    expect(chat.latest('compaction')?.data).toMatchObject({ summary: 'Thread summary.' })

    const bot = chatEntries(sand, ids.bot)
    await tellBot(sand, ids.bot, 'Sign in to the bank and the shop')
    const agentId = await agentOf(sand, ids.bot)
    const agent = chatEntries(sand, agentId)
    await answer(sand, agentId, agent, codeEntry, codeAnswer, id => ({ session: agentId, id, code: values.agentCode }))
    await heardBack(sand, ids.bot, 'Agent signed in.')
    await tellBot(sand, ids.bot, 'Carry on')
    await heardBack(sand, ids.bot, 'Bot carried on.')
    codes.push(totpCode(values.totp))

    const [threadTotp, agentTotp] = [fills[1]?.code, fills[5]?.code]
    expect(codes).toContain(threadTotp!)
    expect(codes).toContain(agentTotp!)
    expect(fills).toEqual([...expectedFills(values.threadCode, threadTotp!), ...expectedFills(values.agentCode, agentTotp!)])
    const hashes = { TOKEN: sha(values.key), USER: sha(values.username), PASS: sha(values.password) }
    expect(await Bun.file(join(work, 'env-thread.json')).json()).toEqual(hashes)
    expect(await Bun.file(join(work, 'env-agent.json')).json()).toEqual(hashes)

    const transcripts = { thread: thread(), agent: agent(), bot: bot() }
    for (const entries of [transcripts.thread, transcripts.agent]) {
      expect(resultText(entries, 'shell')).toContain('token=[secret: Deploy key] user=[secret: Northbank] pass=[secret: Northbank]')
      expect(resultText(entries, 'shell')).toContain('TOKEN=[secret: Deploy key]')
      expect(resultText(entries, 'shell')).toContain('stderr [secret: Deploy key]')
      expect(resultText(entries, 'fails')).toContain('Rejected [secret: Deploy key] for [secret: Northbank]:[secret: Northbank], then [secret:')
      expect(resultText(entries, 'page')).toContain('"code":"[secret: Shop]"')
      expect(resultText(entries, 'page')).toContain('"code":"[secret: Northbank]"')
      expect(resultText(entries, 'login_list')).toContain(`"id":"${ids.bank}"`)
    }
    for (const entries of Object.values(transcripts)) expect(leaksInText(JSON.stringify(entries), codes, values)).toEqual([])
    expect(transcripts.bot.some(entry => entry.type === 'compaction')).toBe(true)

    const sent = sand.requests('fake')
    expect(sent.some(body => body.includes('Banks at Northbank') || body.includes('Bot summary.'))).toBe(true)
    expect(sent.flatMap(body => leaksInText(body, codes, values))).toEqual([])
    expect((await leaksIn(home, values)).found).toEqual([])
    await sand.stop()
    stopped = true
    const after = await leaksIn(home, values)
    expect(after.files).toContain('logins.vault')
    expect(after.files).toContain('sand.db')
    expect(after.found).toEqual([])
  } finally {
    if (!stopped) await sand.stop()
  }
})
