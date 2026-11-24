import type { AppOutput } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { Turns } from '../src'

const recorder = () => {
  const ended: string[] = []
  const output: AppOutput = {
    text() {},
    thinking() {},
    call() {},
    usage() {},
    context() {},
    pause() {},
    finish: stopReason => void ended.push(`finish:${stopReason}`),
    fail: error => void ended.push(`fail:${String(error)}`),
    exit() {},
  }
  return { ended, turns: new Turns(output) }
}

const wire = (stops: string[]) => ({ prompt() {}, stop: () => void stops.push('stop'), close: async () => {} })

test('a stopped turn ends quietly once the app confirms, and a waiting tool call is turned down', async () => {
  const { ended, turns } = recorder()
  const stops: string[] = []
  const session = turns.session(wire(stops))
  session.send([{ type: 'text', text: 'hello' }])
  const call = turns.result('call-1')

  const stopped = session.interrupt()
  expect(stops).toEqual(['stop'])
  await expect(call).rejects.toThrow('sand stopped this turn')

  turns.fail(new Error('interrupted'))
  await stopped
  expect(ended).toEqual([])

  session.send([{ type: 'text', text: 'again' }])
  session.answer('call-2', { type: 'tool_result', callId: 'call-2', content: [] })
  expect(await turns.result('call-2')).toMatchObject({ callId: 'call-2' })
  turns.finish('end_turn')
  expect(ended).toEqual(['finish:end_turn'])
})

test('stopping when no turn runs settles at once without asking the app', async () => {
  const { turns } = recorder()
  const stops: string[] = []
  await turns.session(wire(stops)).interrupt()
  expect(stops).toEqual([])
})
