import {
  type Account,
  connectionCancel,
  connectionClient,
  connectionRemoved,
  connections,
  connectionSave,
  connectionsChange,
  connectionStart,
  connectionState,
  eachAccount,
  type Kind,
} from '@sand/connections/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { join, resolve } from 'node:path'

const entry = resolve(import.meta.dir, '..', 'src', 'index.ts')

let sand: Sand
let plugin: { dispose(): Promise<void> | void }
let provider: ReturnType<typeof fakeProvider>

afterEach(async () => {
  await sand.stop()
  void provider.server.stop(true)
})

const sha256 = (text: string) => new Bun.CryptoHasher('sha256').update(text).digest('base64url')

const json = (body: unknown, status = 200) => Response.json(body, { status })

const fakeProvider = () => {
  const log = { authorize: [] as URLSearchParams[], token: [] as URLSearchParams[] }
  const codes = new Map<string, { challenge: string; redirect: string }>()
  const state = { user: 'ada@example.com', access: '', refresh: '', issued: 0, expiresIn: 3600 }

  const issue = () => {
    state.issued += 1
    state.access = `access-${state.issued}`
    state.refresh = `refresh-${state.issued}`
    return json({ access_token: state.access, refresh_token: state.refresh, expires_in: state.expiresIn, token_type: 'Bearer' })
  }

  const authorized = (request: Request) => request.headers.get('authorization') === `Bearer ${state.access}`

  const token = async (request: Request) => {
    const body = new URLSearchParams(await request.text())
    log.token.push(body)
    if (body.get('client_id') !== 'client-1' || body.get('client_secret') !== 'client-secret') return json({ error: 'invalid_client' }, 401)
    if (body.get('grant_type') === 'refresh_token') return body.get('refresh_token') === state.refresh ? issue() : json({ error: 'invalid_grant', error_description: 'Token has been revoked' }, 400)
    const code = codes.get(body.get('code') ?? '')
    if (!code || sha256(body.get('code_verifier') ?? '') !== code.challenge || body.get('redirect_uri') !== code.redirect) return json({ error: 'invalid_grant' }, 400)
    return issue()
  }

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: request => {
      const url = new URL(request.url)
      if (url.pathname === '/authorize') {
        const params = url.searchParams
        log.authorize.push(params)
        const code = `code-${log.authorize.length}`
        const redirect = params.get('redirect_uri') ?? ''
        codes.set(code, { challenge: params.get('code_challenge') ?? '', redirect })
        return Response.redirect(`${redirect}/?code=${code}&state=${params.get('state')}`, 302)
      }
      if (url.pathname === '/token') return token(request)
      if (!authorized(request)) return new Response('Unauthorized', { status: 401 })
      if (url.pathname === '/me') return json({ email: state.user })
      return new Response('calendar data')
    },
  })
  const base = server.url.origin
  return { server, base, log, state, revoke: () => (state.access = 'revoked'), revokeRefresh: () => (state.refresh = 'revoked') }
}

const oauthKind = (base: string): Kind => ({
  id: 'fake',
  label: 'Fake',
  oauth: {
    authorize: `${base}/authorize`,
    token: `${base}/token`,
    scopes: ['calendar'],
    readOnlyScopes: ['calendar.readonly'],
    params: { access_type: 'offline', prompt: 'consent' },
    setup: { help: 'https://example.com/how-to', steps: 'Make a desktop client.' },
    identify: async (fetch, signal) => ((await (await fetch(`${base}/me`, { signal })).json()) as { email: string }).email,
  },
})

const formKind: Kind = {
  id: 'pass',
  label: 'Password',
  form: {
    fields: [
      { key: 'user', label: 'User' },
      { key: 'password', label: 'App password', secret: true },
    ],
    check: async ({ user, password }) => {
      if (password !== 'app-pass-1') throw new Error('Wrong password')
      return `${user}@pass`
    },
  },
}

const start = async () => {
  provider = fakeProvider()
  sand = await startSand([{ id: 'fake', models: ['m'] }])
  await load()
}

const load = async () => {
  plugin = sand.app.load(entry, { keychain: false })
  await sand.app.settled()
  service().kind(oauthKind(provider.base))
  service().kind(formKind)
}

const service = () => {
  const found = sand.app.get(connections)
  if (!found) throw new Error('connections did not start')
  return found
}

const signIn = async (readOnly = false) => {
  const { url } = await sand.ask(connectionStart, { kind: 'fake', readOnly })
  const page = await fetch(url)
  return { url: new URL(url), page: await page.text() }
}

const connected = async (readOnly = false) => {
  await sand.ask(connectionClient, { kind: 'fake', id: 'client-1', secret: 'client-secret' })
  await signIn(readOnly)
  const [account] = service().accounts('fake')
  if (!account) throw new Error('no account')
  return account
}

test('an OAuth kind signs in through the loopback with PKCE, and signing in again updates the same account', async () => {
  await start()
  await expect(sand.ask(connectionStart, { kind: 'fake' })).rejects.toThrow(/client ID/)
  const configured = await sand.ask(connectionClient, { kind: 'fake', id: 'client-1', secret: 'client-secret' })
  expect(configured.kinds.find(kind => kind.id === 'fake')).toMatchObject({ method: 'oauth', client: true, readOnly: true })

  const { url, page } = await signIn(true)
  expect(page).toContain('Connected ada@example.com')
  const asked = provider.log.authorize[0]!
  expect(Object.fromEntries(asked)).toMatchObject({
    client_id: 'client-1',
    response_type: 'code',
    scope: 'calendar.readonly',
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })
  expect(asked.get('redirect_uri')).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  expect(asked.get('state')!.length).toBeGreaterThanOrEqual(16)
  expect(url.origin).toBe(provider.base)
  const exchanged = provider.log.token[0]!
  expect(sha256(exchanged.get('code_verifier')!)).toBe(asked.get('code_challenge')!)

  const [account] = service().accounts('fake')
  expect(account).toMatchObject({ kind: 'fake', name: 'ada@example.com', readOnly: true })
  expect(account!.id).toMatch(/^fake-[a-z0-9]+$/)

  await signIn(false)
  expect(provider.log.authorize[1]!.get('scope')).toBe('calendar')
  expect(service().accounts()).toEqual([{ ...account!, readOnly: false }])

  const state = JSON.stringify(await sand.ask(connectionState, {}))
  for (const secret of ['access-', 'refresh-', 'client-secret']) expect(state).not.toContain(secret)
})

test('a sign-in answer with the wrong state is refused, and a cancelled sign-in stops listening', async () => {
  await start()
  await sand.ask(connectionClient, { kind: 'fake', id: 'client-1', secret: 'client-secret' })
  const first = await sand.ask(connectionStart, { kind: 'fake' })
  const redirect = new URL(first.url).searchParams.get('redirect_uri')
  const forged = await fetch(`${redirect}/?code=code-1&state=forged`)
  expect(forged.status).toBe(400)
  expect(await forged.text()).toContain('match')
  expect(service().accounts()).toEqual([])

  const second = await sand.ask(connectionStart, { kind: 'fake' })
  expect(await sand.ask(connectionCancel, { flow: second.flow })).toBe(true)
  await expect(fetch(second.url)).rejects.toThrow()
})

test('requests carry the token, refresh before expiry and once on 401, and save the rotated refresh token', async () => {
  await start()
  provider.state.expiresIn = 30
  const account = await connected()
  const tokenCalls = () => provider.log.token.filter(body => body.get('grant_type') === 'refresh_token').length

  provider.state.expiresIn = 3600
  expect(await (await service().fetch(account.id, `${provider.base}/data`)).text()).toBe('calendar data')
  expect(tokenCalls()).toBe(1)
  expect(provider.log.token.at(-1)!.get('refresh_token')).toBe('refresh-1')

  await service().fetch(account.id, `${provider.base}/data`)
  expect(tokenCalls()).toBe(1)

  provider.revoke()
  const answers = await Promise.all([1, 2, 3].map(() => service().fetch(account.id, `${provider.base}/data`)))
  expect(answers.map(answer => answer.status)).toEqual([200, 200, 200])
  expect(tokenCalls()).toBe(2)
  expect(provider.log.token.at(-1)!.get('refresh_token')).toBe('refresh-2')
})

test('a revoked refresh token marks the account to sign in again, and signing in clears it', async () => {
  await start()
  const account = await connected()
  const changes: Account[][] = []
  sand.app.on(connectionsChange, list => void changes.push(list))

  provider.revoke()
  provider.revokeRefresh()
  await expect(service().fetch(account.id, `${provider.base}/data`)).rejects.toThrow(/Sign in to ada@example.com again/)
  expect(service().accounts()[0]!.problem).toBe('Sign in again')
  expect(changes.at(-1)![0]!.problem).toBe('Sign in again')
  await expect(service().fetch(account.id, `${provider.base}/data`)).rejects.toThrow(/Sign in again/)

  await signIn()
  expect(service().accounts()).toEqual([{ ...account }])
  expect((await service().fetch(account.id, `${provider.base}/data`)).status).toBe(200)
})

test('a form kind checks and keeps its values, and disconnecting removes the account', async () => {
  await start()
  const started: string[] = []
  const removed: string[] = []
  eachAccount(sand.app, service(), 'pass', {
    start: account => {
      started.push(account.id)
      return () => {}
    },
    removed: account => void removed.push(account.id),
  })
  const events: string[] = []
  sand.app.on(connectionRemoved, account => void events.push(account.name))

  await expect(sand.ask(connectionSave, { kind: 'pass', values: { user: 'bo', password: 'nope' } })).rejects.toThrow('Wrong password')
  const account = await sand.ask(connectionSave, { kind: 'pass', values: { user: ' bo ', password: 'app-pass-1' } })
  expect(account).toMatchObject({ kind: 'pass', name: 'bo@pass', readOnly: false })
  expect(service().values(account.id)).toEqual({ user: 'bo', password: 'app-pass-1' })
  expect(started).toEqual([account.id])

  const again = await sand.ask(connectionSave, { kind: 'pass', values: { user: 'bo', password: 'app-pass-1' } })
  expect(again.id).toBe(account.id)

  await service().disconnect(account.id)
  expect(events).toEqual(['bo@pass'])
  expect(removed).toEqual([account.id])
  expect(service().accounts()).toEqual([])
  expect(() => service().values(account.id)).toThrow()
  for (const name of ['connections.vault', 'connections.key']) expect(await Bun.file(join(sand.home, name)).exists()).toBe(false)
})

test('the vault on disk is encrypted and survives a reload', async () => {
  await start()
  const oauth = await connected()
  const form = await sand.ask(connectionSave, { kind: 'pass', values: { user: 'bo', password: 'app-pass-1' } })

  const sealed = await Bun.file(join(sand.home, 'connections.vault')).text()
  for (const secret of ['access-', 'refresh-', 'client-secret', 'app-pass-1', 'ada@example.com']) expect(sealed).not.toContain(secret)
  expect(await Bun.file(join(sand.home, 'connections.key')).exists()).toBe(true)
  expect((await sand.ask(connectionState, {})).keychain).toBe(false)

  await plugin.dispose()
  await load()
  expect(service().accounts().map(account => account.id)).toEqual([oauth.id, form.id])
  expect(service().values(form.id)).toEqual({ user: 'bo', password: 'app-pass-1' })
  expect((await service().fetch(oauth.id, `${provider.base}/data`)).status).toBe(200)
})
