import type { Shelves } from '@sand/attachments/web/contract'
import type { Prompt, UserContent } from '@sand/chats/contract'
import { sig } from '@vaakx-dev/vrui'
import { expect, test } from 'bun:test'
import { createModel, type Model } from '../src/model'
import type { SendsSaved } from '../src/send/outgoing'
import type { Outbound, Target } from '../src/target'

const unsaved: SendsSaved = { load: async () => [], save: async () => {} }

const delivered = (model: Model) =>
  new Promise<void>(resolve => {
    const check = () => (model.sending().some(send => !send.failed) ? setTimeout(check, 1) : resolve())
    check()
  })

const targetIn = (conversation: () => string, deliver: (to: { conversation: string }, message: Outbound) => Promise<void>): Target => ({
  place: { device: () => undefined, thread: () => undefined },
  running: () => false,
  stoppable: () => false,
  delivery: () => 'now',
  pcName: () => 'sand',
  name: () => 'helper',
  conversation,
  chat: () => ({ owner: 'thread', id: conversation() }),
  path: () => [],
  ready: () => true,
  destination: () => ({ conversation: conversation() }),
  shownIn: to => to.conversation,
  deliver,
  interrupt: async () => {},
})

const tick = () => new Promise(resolve => setTimeout(resolve))

const act = (model: Model, prompt: string, action: string) =>
  model
    .sending()
    .find(send => send.prompt === prompt)
    ?.actions.find(found => found.id === action)
    ?.run()

const actionsOn = (model: Model, prompt: string) => model.sending().find(send => send.prompt === prompt)?.actions.map(action => action.id)

const slowUploads = () => {
  const uploads: PromiseWithResolvers<UserContent[]>[] = []
  const shelves: Shelves = {
    create: () => ({ attachable: () => true, rejected: () => false, pick: () => {}, paste: () => false, view: () => document.createElement('div'), drops: () => document.createElement('div') }),
    content: () => {
      const upload = Promise.withResolvers<UserContent[]>()
      uploads.push(upload)
      return upload.promise
    },
    uploaded: () => [],
    progress: () => undefined,
    shown: () => [],
  }
  return { shelves, uploads }
}

const sendWithPhoto = (model: Model, text: string) => {
  model.text.set(text)
  model.attached.set([new File(['pixels'], `${text}.png`)])
  return model.send()
}

const sandLosingFirstAnswer = () => {
  const delivered = new Map<string, Prompt>()
  let answers = 0
  const target = targetIn(
    () => 'helper',
    async (_to, { id, text }) => {
      if (!delivered.has(id)) delivered.set(id, text)
      if (answers++ === 0) throw new Error('thread.send got no answer within 30s')
    },
  )
  return { target, delivered }
}

const twoThreads = () => {
  const open = sig('first')
  const arrived: { thread: string; text: string }[] = []
  let failures = 1
  const target = targetIn(
    () => open.get(),
    async (to, { text }) => {
      if (failures-- > 0) throw new Error('the PC went away')
      arrived.push({ thread: to.conversation, text })
    },
  )
  return { open, arrived, target }
}

test('a message sent again after its answer was lost reaches sand once', async () => {
  const { target, delivered: sent } = sandLosingFirstAnswer()
  const model = createModel(target, [], sig(undefined), unsaved)
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

test('a message removed or edited while it waits behind another never reaches sand, and the one already on its way can no longer be taken back', async () => {
  const answered = Promise.withResolvers<void>()
  const arrived: string[] = []
  const target = targetIn(
    () => 'helper',
    async (_to, { text }) => {
      arrived.push(text)
      await answered.promise
    },
  )
  const model = createModel(target, [], sig(undefined), unsaved)
  for (const text of ['first', 'second', 'third']) {
    model.text.set(text)
    await model.send()
  }
  await tick()

  expect(actionsOn(model, 'first')).toEqual([])
  await act(model, 'second', 'remove')
  await act(model, 'third', 'edit')
  expect(model.text.get()).toBe('third')
  model.text.set('third, reworded')
  await model.send()
  answered.resolve()
  await delivered(model)

  expect(arrived).toEqual(['first', 'third, reworded'])
})

test('a message removed while its files upload is never sent, and its failed upload stays out of the composer', async () => {
  const { shelves, uploads } = slowUploads()
  const open = sig('photos')
  const arrived: string[] = []
  const target = targetIn(
    () => open.get(),
    async (_to, { text }) => void arrived.push(text),
  )
  const model = createModel(target, [], sig(shelves), unsaved)
  await sendWithPhoto(model, 'scan')
  open.set('notes')
  await sendWithPhoto(model, 'photo')
  await tick()

  await act(model, 'scan', 'remove')
  await act(model, 'photo', 'remove')
  const [scan, photo] = uploads
  photo?.reject(new Error('the upload was cut off'))
  scan?.resolve([])
  await tick()

  expect(arrived).toEqual([])
  expect(model.text.get()).toBe('')
  expect(model.failure.get()).toBeUndefined()
})
