import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { keyTool, listTool, shareTool, signOutTool } from '../src/tools'

const key = 'sk-test-agent-saved-key'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }])
})

afterAll(() => sand.stop())

const agent = () => ({ call: sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'thread', id: 'helper' } }) })

const openai = (state: unknown) => (state as { accounts: { id: string }[] }).accounts.find(account => account.id === 'openai')

test('an agent saves an API key, shares it and signs out, and never gets the key back', async () => {
  const answers = [
    await keyTool.run({ account: 'openai', key: ` ${key} ` }, agent()),
    await shareTool.run({ account: 'openai', shared: true }, agent()),
    await listTool.run({}, agent()),
  ]

  expect(openai(answers[2])).toMatchObject({ signedIn: true, method: 'api_key', shared: true })
  for (const answer of answers) expect(JSON.stringify(answer)).not.toContain(key)
  expect(await Bun.file(`${sand.home}/auth.json`).text()).toContain(`"${key}"`)

  const after = await signOutTool.run({ account: 'openai' }, agent())

  expect(openai(after)).toMatchObject({ signedIn: false })
  expect(await Bun.file(`${sand.home}/auth.json`).text()).not.toContain(key)
})
