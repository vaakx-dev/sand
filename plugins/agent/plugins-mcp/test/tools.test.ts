import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { definePlugin, inspectorPlugin, service } from 'drydock'
import { listTool, showTool } from '../src/tools'

let sand: Sand

const absent = service<object>('absent')

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['a'], replies: [] }], { plugins: ['extend/plugins'] })
  sand.app.plugin(inspectorPlugin)
  sand.app.plugin(definePlugin({ name: 'waiter', inject: { absent }, apply() {} }))
  sand.app.plugin(
    definePlugin({
      name: 'broken',
      apply() {
        throw new Error('bad config')
      },
    }),
  )
  await sand.app.settled()
})

afterAll(() => sand.stop())

test('plugin_list reports each plugin with its status and what is wrong with it', async () => {
  const rows = await listTool.run({}, { call: sand.ask })

  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'model', status: 'active', problem: undefined }),
      expect.objectContaining({ name: 'waiter', status: 'pending', problem: 'waiting for: absent' }),
      expect.objectContaining({ name: 'broken', status: 'failed', problem: 'bad config' }),
    ]),
  )
})

test('plugin_show gives a failed plugin its stack and a running one the services it provides', async () => {
  const broken = await showTool.run({ name: 'broken' }, { call: sand.ask })
  const model = await showTool.run({ name: 'model' }, { call: sand.ask })

  expect(broken).toEqual(expect.objectContaining({ status: 'failed', stack: expect.stringContaining('Error: bad config') }))
  expect(model).toEqual(expect.objectContaining({ status: 'active', provides: expect.arrayContaining(['modelSettings']) }))
})
