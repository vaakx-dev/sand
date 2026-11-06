import { contextLink } from '@sand/chats/contract'
import { composer as composerService, drafts, typing as typingService, type Composer } from './contract'
import { place } from '@sand/layout/contract'
import { threadsSlot } from '@sand/threads-space/contract'
import { fileIndex, skillIndex, threadSelect } from '@sand/web-client/contract'
import { owned } from '@sand/reactive'
import { quotedText } from '@sand/util'
import { listen } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { fileTrigger } from './complete/files'
import { skillTrigger } from './complete/skills'
import { inject } from './context'
import { card, type Card } from './dock/card'
import { dock } from './dock/dock'
import { createSlots } from './dock/slots'
import { draftSession } from './drafts/session'
import { spacedLink } from './editor/chips/place'
import { createHandoff } from './handoff'
import { createModel } from './model'
import { createPlus } from './plus/entries'
import { createSendMenu } from './send/menu'
import { createTyping } from './typing'

export default definePlugin({
  name: 'composer',
  description: 'Floating prompt card: send, pending messages, completion, attachments, context, unsent drafts, slots for other controls',
  inject,
  apply(ctx) {
    const slots = createSlots()
    const menu = createSendMenu()
    const plus = createPlus()
    const typing = createTyping()
    let current: Card | undefined
    const { model, session } = owned(ctx, () => {
      const model = createModel(ctx)
      const session = draftSession(ctx, model, () => current?.completion.close())
      listen(window, 'pagehide', () => session.keep())
      return { model, session }
    })

    const composer: Composer = {
      focus: () => current?.editor.focus(),
      value: () => model.text.get(),
      set(value) {
        model.text.set(value)
        current?.editor.focusEnd()
      },
      insert(value) {
        if (current) current.editor.insert(value)
        else model.text.update(text => text + value)
      },
      reference(record) {
        model.records.add([record])
        const link = contextLink(record)
        if (current) current.editor.reference(link)
        else model.text.update(text => text + spacedLink(link, text.slice(-1), ''))
      },
      quote(text) {
        if (current) current.editor.quote(text)
        else model.text.update(typed => quotedText([{ kind: 'text', text: typed }, { kind: 'quote', text }]))
      },
      attach: content => model.attached.update(list => [...list, ...content]),
      slot: (where, view, order) => slots.add(where, view, order),
      hold: reason => model.holds.add(reason),
      ...createHandoff(model, () => current?.editor.focusEnd()),
      sendMenu: menu.add,
      plus: plus.add,
      trigger: model.triggers.add,
      command: model.triggers.addCommand,
      settings: model.settings,
      choose: model.choose,
    }

    const parts = { ctx, model, slots, menu, plus, typed: typing.typed }
    session.start()
    place(
      ctx,
      threadsSlot('main'),
      () => {
        current = card(parts)
        return dock(parts, current)
      },
      2,
    )
    ctx.on(threadSelect, session.open)
    ctx.watch(fileIndex, found => found && model.triggers.add(fileTrigger(found, ctx.threads)))
    ctx.watch(skillIndex, found => found && model.triggers.add(skillTrigger(found)))
    ctx.effect(() => () => session.keep())
    ctx.provide(composerService, composer)
    ctx.provide(drafts, session.drafts)
    ctx.provide(typingService, typing)
    ctx.effect(() => typing.stop)
  },
})
