import type { Composer } from './contract'
import { listen, owned, place, style } from '@sand/dom'
import { definePlugin } from 'drydock'
import { catchFiles } from './attachments/drop'
import { bindLocalCommands } from './commands'
import { card, type Card } from './dock/card'
import { dock } from './dock/dock'
import { createSlots } from './dock/slots'
import { draftSession } from './drafts/session'
import { createModel } from './model'
import { css } from './style'

export default definePlugin({
  name: 'composer-card',
  description: 'Floating prompt card: send, follow-up queue, completion, attachments, context, unsent drafts, slots for other controls',
  inject: ['threads', 'turns'],
  uses: {
    layout: 'lands loose on the stage',
    commands: '/ completion shows a hint, typed commands go straight to the server, and a failed turn offers no model picker',
    models: 'a failed turn does not name the PC its model lives on',
    fileIndex: 'no @ file completion',
    skillIndex: 'no $ skill completion',
    wire: 'no offline state; sends fail when the connection drops',
    jobs: 'no still-working agents chip',
    panels: 'the still-working agents chip is not clickable',
    media: 'queued images stored on the server show no thumbnail',
    notify: 'failed stops and copies are not reported',
  },
  apply(ctx) {
    style(ctx, css)
    const slots = createSlots()
    let current: Card | undefined
    const { model, dropping, session } = owned(ctx, () => {
      const model = createModel(ctx)
      const session = draftSession(ctx, model, () => current?.completion.close())
      listen(window, 'pagehide', session.keep)
      return { model, dropping: catchFiles(model.files), session }
    })

    const composer: Composer = {
      focus: () => current?.field.focus(),
      value: () => model.text.get(),
      set(value) {
        model.text.set(value)
        const field = current?.field
        if (!field) return
        field.focus()
        field.selectionStart = field.selectionEnd = value.length
      },
      insert(value) {
        const field = current?.field
        if (!field) return model.text.update(text => text + value)
        field.setRangeText(value, field.selectionStart, field.selectionEnd, 'end')
        model.text.set(field.value)
      },
      attach: content => model.files.attach(content),
      slot: (where, view, order) => slots.add(where, view, order),
      capture: entry => model.addCapture(entry),
    }

    const parts = { ctx, model, slots, dropping }
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
    bindLocalCommands(ctx, () => current?.choose())
    ctx.on('thread.select', session.open)
    ctx.effect(() => () => session.keep())
    ctx.provide('composer', composer)
    ctx.provide('drafts', session.drafts)
  },
})
