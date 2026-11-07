import type { Prompt } from '@sand/chats/contract'
import { sig } from '@vaakx-dev/vrui'
import { expect, test } from 'bun:test'
import type { Chat } from '../src/contract'
import { createModel } from '../src/model'
import { chatTarget } from '../src/target'

const sandLosingFirstAnswer = () => {
  const delivered = new Map<string, Prompt>()
  let answers = 0
  const chat: Chat = {
    skills: { bot: 'helper' },
    running: () => false,
    path: () => [],
    async send(prompt, clientRequestId) {
      const request = clientRequestId || crypto.randomUUID()
      if (!delivered.has(request)) delivered.set(request, prompt)
      if (answers++ === 0) throw new Error('bot.send got no answer within 30s')
    },
    interrupt: async () => {},
  }
  return { chat, delivered }
}

test('a message sent again after its answer was lost reaches sand once', async () => {
  const { chat, delivered } = sandLosingFirstAnswer()
  const model = createModel(chatTarget(chat), [], sig(undefined))
  model.text.set('ship it')

  await model.send()
  expect(model.failure.get()?.text).toContain('Your message is still here')
  expect(model.text.get()).toBe('ship it')

  await model.send()
  expect(model.failure.get()).toBeUndefined()
  expect(model.text.get()).toBe('')
  expect([...delivered.values()]).toHaveLength(1)
})
