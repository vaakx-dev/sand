import { shelves, type Shelves } from '@sand/attachments/web/contract'
import { contextLink } from '@sand/chats/contract'
import { composer as composerService, drafts, typing as typingService, type Chat, type ChatDock, type Composer } from './contract'
import { fileIndex, skillIndex, threadSelect, type SkillIndex } from '@sand/web-client/contract'
import { owned } from '@sand/reactive'
import { quotedText } from '@sand/util'
import { collectScope, disposeAll, listen, sig, type ScopedValue } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { fileTrigger } from './complete/files'
import { createTriggers } from './complete/registry'
import { skillTrigger } from './complete/skills'
import { inject } from './context'
import { card, type Card } from './dock/card'
import { dock } from './dock/dock'
import { createSlots } from './dock/slots'
import { draftSession } from './drafts/session'
import { spacedLink } from './editor/chips/place'
import { createTurnErrors, turnErrorBanner } from './errors/turn'
import { createHandoff } from './handoff'
import { createModel } from './model'
import { createPlus } from './plus/entries'
import { createSendMenu } from './send/menu'
import { chatTarget } from './target'
import { threadSettings, threadTarget } from './thread'
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
    const triggers = createTriggers()
    const threadOnly = createTriggers()
    const skills = sig<SkillIndex | undefined>(undefined)
    const shelf = sig<Shelves | undefined>(undefined)
    ctx.watch(shelves, found => {
      shelf.set(found)
    })
    let current: Card | undefined
    const { model, session, errors } = owned(ctx, () => {
      const model = createModel(threadTarget(ctx), [triggers, threadOnly], shelf)
      const session = draftSession(ctx, model, () => current?.completion.close())
      listen(window, 'pagehide', () => session.keep())
      return { model, session, errors: createTurnErrors(ctx) }
    })

    const chatDock = (chat: Chat): ChatDock => {
      const own = createSlots()
      const chatOnly = createTriggers()
      chatOnly.add(skillTrigger(() => skills.get()?.of(chat.skills) ?? []))
      const parts = { ctx, model: createModel(chatTarget(chat), [triggers, chatOnly], shelf), slots: own, plus: createPlus(), actions: () => [], typed: typing.typed }
      return { view: dock(parts, card(parts)), slot: own.add }
    }

    const parts = { ctx, model, slots, plus, actions: menu.actions(model), typed: typing.typed }
    let built: ScopedValue<HTMLElement> | undefined
    ctx.effect(() => () => {
      if (built) disposeAll(built.scope)
    })

    const composer: Composer = {
      view() {
        built ??= collectScope(() => {
          current = card(parts)
          return dock(parts, current, turnErrorBanner(ctx, model, errors))
        })
        return built.value
      },
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
      trigger: triggers.add,
      command: triggers.addCommand,
      settings: () => threadSettings(ctx, model.picked.get()),
      choose: model.choose,
      dock: chatDock,
    }

    session.start()
    ctx.on(threadSelect, session.open)
    ctx.watch(fileIndex, found => found && threadOnly.add(fileTrigger(found, ctx.threads)))
    ctx.watch(skillIndex, found => {
      skills.set(found)
      return found && threadOnly.add(skillTrigger(() => found.list()))
    })
    ctx.effect(() => () => session.keep())
    ctx.provide(composerService, composer)
    ctx.provide(drafts, session.drafts)
    ctx.provide(typingService, typing)
    ctx.effect(() => typing.stop)
  },
})
