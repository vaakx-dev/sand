import { type Caller, createHandlers, request, type } from '@sand/host-hub/contract'
import { expect, test } from 'bun:test'
import { z } from 'zod'
import { answerRuntime } from '../src/answer'
import type { HostMessage, RuntimeMessage } from '../src/contract'
import { createHostChannel } from '../src/link/channel'

const whoAsked = request('test.who', { input: () => z.object({}), output: type<Caller>(), callers: 'any' })
const ownerOnly = request('test.owner', { input: () => z.object({}), output: type<string>() })

const linkedHost = () => {
  const hub = createHandlers()
  hub.handle(whoAsked, (_, caller) => caller)
  hub.handle(ownerOnly, () => 'done')
  const link = createHostChannel(message => void relay(message))
  const relay = async (message: RuntimeMessage) => {
    if (message.type !== 'call') return
    const answer: HostMessage = { type: 'answer', id: message.id, ...(await answerRuntime(hub, 'runtime-1', message)) }
    link.receive(answer)
  }
  return link.channel
}

test('a runtime asks the host as one of its agents, and the host answers as that agent', async () => {
  const host = linkedHost()
  const agent: Caller = { device: 'sand', kind: 'agent', actor: { owner: 'bot', id: 'b1' } }

  expect(await host.ask(whoAsked, {}, agent)).toEqual(agent)
})

test('a runtime cannot pass a page off as the caller', async () => {
  const host = linkedHost()

  await expect(host.ask(ownerOnly, {}, { device: 'page', kind: 'browser' })).rejects.toThrow("A runtime can't ask for test.owner")
})
