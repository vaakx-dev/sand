import type { Prompt } from '@sand/chats/contract'
import { sig } from '@vaakx-dev/vrui'
import { expect, test } from 'bun:test'
import type { Chat } from '../src/contract'
import { createModel, type Model } from '../src/model'
import { unsaved } from '../src/send/outgoing'
import { chatTarget, type Target } from '../src/target'

const delivered = (model: Model) =>
  new Promise<void>(resolve => {
    const check = () => (model.sending().some(send => !send.failed) ? setTimeout(check, 1) : resolve())
    check()
  })

const sandLosingFirstAnswer = () => {
  const delivered = new Map<string, Prompt>()
  let answers = 0
  const chat: Chat = {
    ref: { owner: 'bot', id: 'helper' },
    name: () => 'helper',
    skills: { bot: 'helper' },
    running: () => false,
    path: () => [],
    async send(prompt, clientRequestId) {
      if (!delivered.has(clientRequestId)) delivered.set(clientRequestId, prompt)
      if (answers++ === 0) throw new Error('bot.send got no answer within 30s')
    },
    interrupt: async () => {},
  }
  return { chat, delivered }
}

const twoThreads = () => {
  const open = sig('first')
  const arrived: { thread: string; text: string }[] = []
  let failures = 1
  const target: Target = {
    ...chatTarget(sandLosingFirstAnswer().chat),
    conversation: () => open.get(),
    destination: () => ({ conversation: open.get() }),
    async deliver(to, { text }) {
      if (failures-- > 0) throw new Error('the PC went away')
      arrived.push({ thread: to.conversation, text })
    },
  }
  return { open, arrived, target }
}

test('a message sent again after its answer was lost reaches sand once', async () => {
  const { chat, delivered: sent } = sandLosingFirstAnswer()
  const model = createModel(chatTarget(chat), [], sig(undefined), unsaved)
  model.text.set('ship it')

  model.send()
  expect(model.text.get()).toBe('')
  expect(model.sending()).toMatchObject([{ conversation: 'helper', prompt: 'ship it' }])
  await delivered(model)
  expect(model.sending()).toEqual([])
  expect(model.failure.get()?.text).toContain('Your message is still here')
  expect(model.text.get()).toBe('ship it')

  model.send()
  await delivered(model)
  expect(model.failure.get()).toBeUndefined()
  expect(model.text.get()).toBe('')
  expect([...sent.values()]).toHaveLength(1)
})

test('a message keeps going to the thread it was sent in after you open another, and waits there to retry when it fails', async () => {
  const { open, arrived, target } = twoThreads()
  const model = createModel(target, [], sig(undefined), unsaved)
  model.text.set('look at this')
  model.send()
  open.set('second')
  await delivered(model)

  expect(model.text.get()).toBe('')
  const [failed] = model.sending()
  expect(failed).toMatchObject({ conversation: 'first', failed: true })

  await failed?.actions.find(action => action.id === 'retry')?.run()
  await delivered(model)
  expect(arrived).toEqual([{ thread: 'first', text: 'look at this' }])
  expect(model.sending()).toEqual([])
})
