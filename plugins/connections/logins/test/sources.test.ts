import type { Fill } from '@sand/computers/contract'
import { tools } from '@sand/tools/contract'
import { openVault } from '@sand/vault'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { loginChange, loginPick, loginsState, sourceConnect, sourceDisconnect, type SourceItem, sourceSearch } from '../src/contract'
import { fakeClis, type World } from './fake-cli'
import { browser, call, leaksIn, leaksInText, resultText, said, type Sand, start, threadEntries } from './fixture'

let folders: string[] = []

afterEach(() => {
  for (const made of folders) rmSync(made, { recursive: true, force: true })
  folders = []
})

const folder = () => {
  const made = mkdtempSync(join(tmpdir(), 'sand-logins-sources-'))
  folders.push(made)
  return made
}

const tag = crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const code = () => String(100_000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 900_000))

const fetched = {
  bwUsername: `kai.${tag}@example.net`,
  bwPassword: `Bw-${tag}-Lantern77`,
  bwSeed: `JBSWY3DP${tag.toUpperCase().replace(/[^A-Z]/g, 'Q')}XQ`,
  bwNote: `note_${tag}_BuildKey`,
  bwsValue: `bws_${tag}_DeployToken`,
  bwsNote: `Rotate ${tag} quarterly`,
  opUsername: `mira.${tag}@example.org`,
  opPassword: `Op-${tag}-Tidepool31`,
  opSeed: `otpauth://totp/Lighthouse:mira?secret=GEZDGNBV${tag.toUpperCase().replace(/[^A-Z]/g, 'R')}`,
  opCredential: `op_${tag}_WeatherCredential`,
}

const credentials = {
  master: `Master-${tag}-Correct-Horse`,
  session: `Session${tag}Key==`,
  bwsToken: `0.${tag}.MachineToken`,
  opToken: `ops_${tag}_ServiceToken`,
}

const values = { ...fetched, ...credentials }

const ids = { harbor: `b1f4c2d0-${tag.slice(0, 4)}-4a1e-9c3b-${tag}`, build: `c7e2a9b4-${tag.slice(0, 4)}-4f0d-8e21-${tag}`, card: 'd0c0ffee-0000-4000-8000-000000000001', deploy: `e5a1d3c8-${tag.slice(0, 4)}-4b6f-a07d-${tag}` }

const codes = { harbor: code(), lighthouse: code() }

const world = (): World => ({
  bitwarden: {
    email: 'kai@example.net',
    password: credentials.master,
    session: credentials.session,
    unlocked: false,
    items: [
      {
        id: ids.harbor,
        name: 'Harbor Mail',
        type: 1,
        notes: null,
        login: { username: fetched.bwUsername, password: fetched.bwPassword, totp: fetched.bwSeed, uris: [{ uri: 'https://mail.harbor.example/login' }, { uri: 'androidapp://example.harbor' }] },
      },
      { id: ids.build, name: 'Build server key', type: 2, notes: fetched.bwNote },
      { id: ids.card, name: 'Travel card', type: 3 },
    ],
    codes: { [ids.harbor]: codes.harbor },
  },
  secrets: { token: credentials.bwsToken, items: [{ id: ids.deploy, key: 'DEPLOY_TOKEN', value: fetched.bwsValue, note: fetched.bwsNote, projectId: 'project-1' }] },
  onepassword: {
    token: credentials.opToken,
    url: 'https://example.1password.com',
    items: [
      {
        id: 'lighthouse1',
        title: 'Lighthouse Bank',
        category: 'LOGIN',
        vault: { id: 'private1', name: 'Private' },
        urls: [{ href: 'https://lighthouse-bank.example/signin', primary: true }],
        fields: [
          { id: 'username', type: 'STRING', purpose: 'USERNAME', label: 'username', value: fetched.opUsername },
          { id: 'password', type: 'CONCEALED', purpose: 'PASSWORD', label: 'password', value: fetched.opPassword },
          { id: 'otp', type: 'OTP', label: 'one-time password', value: fetched.opSeed },
        ],
      },
      { id: 'weather1', title: 'Weather API', category: 'API_CREDENTIAL', vault: { id: 'private1', name: 'Private' }, fields: [{ id: 'credential', type: 'CONCEALED', label: 'credential', value: fetched.opCredential }] },
    ],
    codes: { lighthouse1: codes.lighthouse },
  },
})

const connectAll = async (sand: Sand) => {
  await sand.ask(sourceConnect, { source: 'bitwarden', secret: credentials.master })
  await sand.ask(sourceConnect, { source: 'bitwarden-secrets', secret: credentials.bwsToken })
  return sand.ask(sourceConnect, { source: '1password', secret: credentials.opToken })
}

const pickAll = async (sand: Sand) => ({
  harbor: await sand.ask(loginPick, { source: 'bitwarden', item: ids.harbor }),
  build: await sand.ask(loginPick, { source: 'bitwarden', item: ids.build }),
  deploy: await sand.ask(loginPick, { source: 'bitwarden-secrets', item: ids.deploy }),
  lighthouse: await sand.ask(loginPick, { source: '1password', item: 'lighthouse1', vault: 'private1', name: 'Lighthouse' }),
  weather: await sand.ask(loginPick, { source: '1password', item: 'weather1', vault: 'private1' }),
})

const storedData = async (home: string) => JSON.stringify(await openVault(home, 'logins', undefined).then(vault => vault.read()))

test("Settings shows each vault's status, unlocks Bitwarden with the master password, finds items by name and site only, and picks them without copying a value", async () => {
  const home = folder()
  const clis = await fakeClis(folder(), world())
  const sand = await start([], { home, options: { logins: clis.paths } })
  try {
    expect((await sand.ask(loginsState, {})).sources).toEqual({
      bitwarden: { status: 'locked', account: 'kai@example.net', saved: false },
      'bitwarden-secrets': { status: 'signed-out', saved: false },
      '1password': { status: 'signed-out', saved: false },
    })
    await expect(sand.ask(sourceSearch, { source: 'bitwarden', query: '' })).rejects.toThrow('Bitwarden is locked: unlock it in Settings → Logins')
    await expect(sand.ask(sourceConnect, { source: 'bitwarden', secret: 'not-the-password' })).rejects.toThrow('That master password is wrong')
    await expect(sand.ask(sourceConnect, { source: '1password', secret: 'ops_not_a_token' })).rejects.toThrow('1Password refused the service account token: set a new one in Settings → Logins')

    expect((await connectAll(sand)).sources).toEqual({
      bitwarden: { status: 'ready', account: 'kai@example.net', saved: true },
      'bitwarden-secrets': { status: 'ready', saved: true },
      '1password': { status: 'ready', account: 'example.1password.com', saved: true },
    })
    const harbor: SourceItem = { source: 'bitwarden', item: ids.harbor, name: 'Harbor Mail', kind: 'website', sites: ['mail.harbor.example'], totp: true }
    expect(await sand.ask(sourceSearch, { source: 'bitwarden', query: '' })).toEqual([{ source: 'bitwarden', item: ids.build, name: 'Build server key', kind: 'key', sites: [], totp: false }, harbor])
    expect(await sand.ask(sourceSearch, { source: 'bitwarden', query: 'harbor.example' })).toEqual([harbor])
    expect(await sand.ask(sourceSearch, { source: 'bitwarden-secrets', query: 'deploy' })).toEqual([
      { source: 'bitwarden-secrets', item: ids.deploy, name: 'DEPLOY_TOKEN', kind: 'key', sites: [], totp: false },
    ])
    expect(await sand.ask(sourceSearch, { source: '1password', query: '' })).toEqual([
      { source: '1password', item: 'lighthouse1', vault: 'private1', name: 'Lighthouse Bank', kind: 'website', sites: ['lighthouse-bank.example'], place: 'Private' },
      { source: '1password', item: 'weather1', vault: 'private1', name: 'Weather API', kind: 'key', sites: [], place: 'Private' },
    ])

    await expect(sand.ask(loginPick, { source: 'bitwarden-secrets', item: ids.deploy, kind: 'website', site: 'deploy.example' })).rejects.toThrow(
      'Bitwarden Secrets Manager keeps keys, not website logins',
    )
    const picked = await pickAll(sand)
    expect(picked.harbor).toMatchObject({ source: 'bitwarden', item: ids.harbor, kind: 'website', name: 'Harbor Mail', site: 'mail.harbor.example', totp: true })
    expect(picked.lighthouse).toMatchObject({ source: '1password', item: 'lighthouse1', vault: 'private1', kind: 'website', name: 'Lighthouse', site: 'lighthouse-bank.example', totp: true })
    expect(picked.weather).toMatchObject({ source: '1password', kind: 'key', totp: false })
    await expect(sand.ask(loginChange, { id: picked.lighthouse.id, password: 'changed-here' })).rejects.toThrow('Lighthouse lives in 1Password: change it there')

    expect((await sand.ask(sourceDisconnect, { source: 'bitwarden' })).sources.bitwarden).toEqual({ status: 'locked', account: 'kai@example.net', saved: false })
    expect((await clis.world()).bitwarden.unlocked).toBe(false)
    expect(leaksInText(await storedData(home), Object.values(codes), { ...fetched, master: credentials.master })).toEqual([])
  } finally {
    await sand.stop()
  }
})

const script = `const hash = text => new Bun.CryptoHasher('sha256').update(text).digest('hex')
const { TOKEN = '', API = '', NOTE = '', USER = '' } = process.env
await Bun.write(import.meta.dir + '/env.json', JSON.stringify({ TOKEN: hash(TOKEN), API: hash(API), NOTE: hash(NOTE), USER: hash(USER) }))
console.log('token=' + TOKEN + ' api=' + API + ' note=' + NOTE + ' user=' + USER)
`

const sha = (text: string) => new Bun.CryptoHasher('sha256').update(text).digest('hex')

test('a thread fills, enters codes and passes keys from Bitwarden, Secrets Manager and 1Password with no value reaching the model, a transcript, the vault or a file, and a lapsed session says to unlock', async () => {
  const home = folder()
  const work = folder()
  await Bun.write(join(work, 'print.ts'), script)
  const clis = await fakeClis(folder(), world())
  const options = { home, options: { logins: clis.paths } }
  const setup = await start([], options)
  await connectAll(setup)
  const picked = await pickAll(setup)
  const chat = setup.chat('fake/m')
  for (const login of Object.values(picked)) await setup.ask(loginChange, { id: login.id, threads: [chat.id] })
  await setup.stop()

  const logins = { TOKEN: picked.deploy.id, API: picked.weather.id, NOTE: picked.build.id, USER: `${picked.harbor.id}/username` }
  const sand = await start(
    [
      [call('login_fill', { login: picked.harbor.id })],
      [call('login_code', { login: picked.harbor.id, prompt: 'Enter the code from your app' })],
      [call('login_fill', { login: picked.lighthouse.id })],
      [call('login_code', { login: picked.lighthouse.id, prompt: 'Enter the code from your app' })],
      [call('shell', { command: `bun ${join(work, 'print.ts').replaceAll('\\', '/')}`, logins })],
      [call('fails')],
      [call('page')],
      [said('Signed in.')],
      [call('login_fill', { login: picked.harbor.id })],
      [said('Bitwarden is locked.')],
    ],
    options,
  )
  try {
    const fills = browser(sand)
    sand.app.get(tools)!.register({
      name: 'fails',
      description: 'Fails',
      effect: 'read',
      input: z.object({}),
      run() {
        throw new Error(`Rejected ${fetched.bwsValue} and ${fetched.opCredential} for ${fetched.opUsername}:${fetched.opPassword}`)
      },
    })
    const thread = sand.sessions.require(chat.id)
    expect(await sand.turns.run(thread, 'Sign in to the mail and the bank')).toMatchObject({ text: 'Signed in.' })
    expect(fills).toEqual([
      { site: 'mail.harbor.example', username: fetched.bwUsername, password: fetched.bwPassword },
      { site: 'mail.harbor.example', code: codes.harbor },
      { site: 'lighthouse-bank.example', username: fetched.opUsername, password: fetched.opPassword },
      { site: 'lighthouse-bank.example', code: codes.lighthouse },
    ] satisfies Fill[])
    expect(await Bun.file(join(work, 'env.json')).json()).toEqual({ TOKEN: sha(fetched.bwsValue), API: sha(fetched.opCredential), NOTE: sha(fetched.bwNote), USER: sha(fetched.bwUsername) })

    await clis.change({ ...(await clis.world()), bitwarden: { ...world().bitwarden, unlocked: false } })
    expect(await sand.turns.run(thread, 'Sign in to the mail again')).toMatchObject({ text: 'Bitwarden is locked.' })
    expect((await sand.ask(loginsState, {})).sources.bitwarden).toEqual({ status: 'locked', account: 'kai@example.net', saved: true })

    const entries = threadEntries(sand, chat.id)()
    expect(resultText(entries, 'shell')).toContain('token=[secret: DEPLOY_TOKEN] api=[secret: Weather API] note=[secret: Build server key] user=[secret: Harbor Mail]')
    expect(resultText(entries, 'fails')).toContain('Rejected [secret: DEPLOY_TOKEN] and [secret: Weather API] for [secret: Lighthouse]:[secret: Lighthouse]')
    expect(resultText(entries, 'page')).toContain('"code":"[secret: Harbor Mail]"')
    expect(resultText(entries, 'page')).toContain('"code":"[secret: Lighthouse]"')
    expect(resultText(entries, 'login_fill')).toContain('Bitwarden is locked: unlock it in Settings → Logins')
    expect(leaksInText(JSON.stringify(entries), Object.values(codes), values)).toEqual([])
    expect(sand.requests('fake').flatMap(body => leaksInText(body, Object.values(codes), values))).toEqual([])
    expect((await leaksIn(home, values)).found).toEqual([])
  } finally {
    await sand.stop()
  }
  expect((await leaksIn(home, values)).found).toEqual([])
  expect(leaksInText(await storedData(home), Object.values(codes), { ...fetched, master: credentials.master })).toEqual([])
})
