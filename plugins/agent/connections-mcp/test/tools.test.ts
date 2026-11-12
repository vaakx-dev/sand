import { connections } from '@sand/connections/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { clientTool, listTool, removeTool, saveTool, startTool } from '../src/tools'

const password = 'app-pass-agent'
const clientSecret = 'client-secret-agent'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['connections/connections'], options: { connections: { keychain: false } } })
  const service = sand.app.get(connections)
  if (!service) throw new Error('connections did not start')
  service.kind({
    id: 'pass',
    label: 'Password',
    form: {
      fields: [
        { key: 'user', label: 'User' },
        { key: 'password', label: 'App password', secret: true },
      ],
      check: async ({ user }) => `${user}@pass`,
    },
  })
  service.kind({
    id: 'web',
    label: 'Web',
    oauth: {
      authorize: 'https://auth.example.com/authorize',
      token: 'https://auth.example.com/token',
      scopes: ['calendar'],
      setup: { help: 'https://example.com/how-to', steps: 'Make a desktop client.' },
      identify: async () => 'someone',
    },
  })
})

afterAll(() => sand.stop())

const agent = () => ({ call: sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'bot', id: 'helper' } }) })

test('an agent connects and disconnects accounts, and never gets a password or client secret back', async () => {
  const account = await saveTool.run({ kind: 'pass', values: { user: 'bo', password } }, agent())
  const configured = await clientTool.run({ kind: 'web', id: 'client-1', secret: clientSecret }, agent())
  const started = await startTool.run({ kind: 'web' }, agent())
  const listed = await listTool.run({}, agent())

  expect(account).toMatchObject({ kind: 'pass', name: 'bo@pass' })
  expect(listed).toMatchObject({ accounts: [account], kinds: expect.arrayContaining([expect.objectContaining({ id: 'web', client: true })]) })
  expect(started).toMatchObject({ url: expect.stringContaining('https://auth.example.com/authorize?client_id=client-1') })
  for (const answer of [account, configured, started, listed]) {
    expect(JSON.stringify(answer)).not.toContain(password)
    expect(JSON.stringify(answer)).not.toContain(clientSecret)
  }

  const after = await removeTool.run({ account: (account as { id: string }).id }, agent())

  expect(after).toMatchObject({ accounts: [] })
})
