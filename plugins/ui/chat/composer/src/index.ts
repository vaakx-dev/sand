import { composer as composerService, drafts, type Composer } from './contract'
import { place } from '@sand/layout/place'
import { threadSelect } from '@sand/web-client/contract'
import { owned } from '@sand/web-client/reactive'
import { listen } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { catchFiles } from './attachments/drop'
import { inject } from './context'
import { card, type Card } from './dock/card'
import { dock } from './dock/dock'
import { createSlots } from './dock/slots'
import { draftSession } from './drafts/session'
import { createHandoff } from './handoff'
import { createModel } from './model'
import { createSendMenu } from './send/menu'

export default definePlugin({
  name: 'composer',
  description: 'Floating prompt card: send, pending messages, completion, attachments, context, unsent drafts, slots for other controls',
  inject,
  apply(ctx) {
    const slots = createSlots()
    const menu = createSendMenu()
    let current: Card | undefined
    const { model, dropping, session } = owned(ctx, () => {
      const model = createModel(ctx)
      const session = draftSession(ctx, model, () => current?.completion.close())
      listen(window, 'pagehide', () => session.keep())
      return { model, dropping: catchFiles(model.files), session }
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
      quote(text) {
        if (current) current.editor.quote(text)
        else model.segments.quote(text)
      },
      attach: content => model.files.attach(content),
      slot: (where, view, order) => slots.add(where, view, order),
      hold: reason => model.holds.add(reason),
      ...createHandoff(ctx, model, () => current?.editor.focusEnd()),
      sendMenu: menu.add,
    }

    const parts = { ctx, model, slots, menu, dropping }
    session.start()
    place(
      ctx,
      'main',
      () => {
        current = card(parts)
        return dock(parts, current)
      },
      2,
    )
    ctx.on(threadSelect, session.open)
    ctx.effect(() => () => session.keep())
    ctx.provide(composerService, composer)
    ctx.provide(drafts, session.drafts)
  },
})
