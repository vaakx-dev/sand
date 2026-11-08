import { advanced as advancedService, type Advanced } from '@sand/advanced/contract'
import { shelves, type Shelves } from '@sand/attachments/web/contract'
import { contextLink } from '@sand/chats/contract'
import { modelButton, type ModelButton } from '@sand/model-panel/contract'
import { composer as composerService, drafts, draftStore, typing as typingService, type Chat, type ChatDock, type Composer, type DockOptions, type DraftStore } from './contract'
import { fileIndex, skillIndex, threadSelect, type SkillIndex } from '@sand/web-client/contract'
import { owned, pulse } from '@sand/reactive'
import { quotedText } from '@sand/util'
import { listen, onMount, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { fileTrigger } from './complete/files'
import { createTriggers } from './complete/registry'
import { skillTrigger } from './complete/skills'
import { inject } from './context'
import { dock } from './dock/dock'
import { field, type Field } from './dock/field'
import { createSlots } from './dock/slots'
import { dockDrafts } from './drafts/dock'
import { draftSession } from './drafts/session'
import { spacedLink } from './editor/chips/place'
import { createTurnErrors, turnErrorBanner } from './errors/turn'
import { createHandoff } from './handoff'
import { createModel } from './model'
import { createPlaceholders } from './placeholder'
import { createPlus } from './plus/entries'
import { createAsides } from './send/aside'
import { createSendMenu } from './send/menu'
import { chatTarget } from './target'
import { chooseSettings, nextSettings, threadTarget } from './thread'
import { createTyping } from './typing'

export default definePlugin({
  name: 'composer',
  description: 'Prompt field: send, pending messages, completion, attachments, context, unsent drafts, slots for other controls',
  inject,
  apply(ctx) {
    const shared = createSlots()
    const slots = createSlots(shared)
    const asides = createAsides()
    const store = sig<DraftStore | undefined>(undefined)
    const menu = createSendMenu()
    const plus = createPlus()
    const typing = createTyping()
    const triggers = createTriggers()
    const threadOnly = createTriggers()
    const skills = sig<SkillIndex | undefined>(undefined)
    const shelf = sig<Shelves | undefined>(undefined)
    const button = sig<ModelButton | undefined>(undefined)
    const advanced = sig<Advanced | undefined>(undefined)
    ctx.watch(shelves, found => {
      shelf.set(found)
    })
    ctx.watch(modelButton, found => {
      button.set(found)
    })
    ctx.watch(advancedService, found => {
      advanced.set(found)
    })

    const mounted: Field[] = []
    const live = () => mounted.at(-1)
    const track = (built: Field) =>
      onMount(built.node, () => {
        mounted.push(built)
        return () => {
          mounted.splice(mounted.indexOf(built), 1)
        }
      })

    const { model, session, errors, placeholders } = owned(ctx, () => {
      const model = createModel(threadTarget(ctx), [triggers, threadOnly], shelf)
      const session = draftSession(ctx, model, () => store.get(), () => mounted.forEach(built => built.completion.close()))
      const inThread = pulse(ctx, [threadSelect]).read(() => Boolean(ctx.threads.current()))
      listen(window, 'pagehide', () => session.keep())
      return { model, session, errors: createTurnErrors(ctx), placeholders: createPlaceholders(() => (inThread.get() ? 'Reply' : 'Ask anything')) }
    })

    const chatDock = (chat: Chat, { kind = 'thread', placeholder }: DockOptions = {}): ChatDock => {
      const own = createSlots(shared)
      const chatOnly = createTriggers()
      chatOnly.add(skillTrigger(() => skills.get()?.of(chat.skills) ?? []))
      const model = createModel(chatTarget(chat), [triggers, chatOnly], shelf)
      dockDrafts(chat.key, model, () => store.get())
      const shown = () => kind !== 'bot' || Boolean(advanced.get()?.on())
      const parts = {
        ctx,
        model,
        slots: own,
        plus: createPlus(),
        actions: () => [],
        typed: typing.typed,
        asides,
        placeholder: placeholder ?? (() => (chat.path().length ? 'Reply' : 'Ask anything')),
        ...(chat.settings && chat.choose && { choice: { target: { settings: chat.settings, choose: chat.choose, running: chat.running }, button: () => (shown() ? button.get() : undefined) } }),
      }
      return { view: dock(parts, field(parts)), slot: own.add }
    }

    const settings = () => nextSettings(ctx, model.picked.get())
    const choose = chooseSettings(ctx, model)
    const parts = {
      ctx,
      model,
      slots,
      plus,
      actions: menu.actions(model),
      typed: typing.typed,
      asides,
      placeholder: () => placeholders.text.get(),
      choice: { target: { settings, choose, running: () => model.running.get() }, button: () => button.get() },
    }

    const composer: Composer = {
      view() {
        const built = field(parts)
        track(built)
        return dock(parts, built, turnErrorBanner(ctx, model, errors))
      },
      focus: () => live()?.editor.focus(),
      value: () => model.text.get(),
      set(value) {
        model.text.set(value)
        live()?.editor.focusEnd()
      },
      insert(value) {
        const shown = live()
        if (shown) shown.editor.insert(value)
        else model.text.update(text => text + value)
      },
      reference(record) {
        model.records.add([record])
        const link = contextLink(record)
        const shown = live()
        if (shown) shown.editor.reference(link)
        else model.text.update(text => text + spacedLink(link, text.slice(-1), ''))
      },
      quote(text) {
        const shown = live()
        if (shown) shown.editor.quote(text)
        else model.text.update(typed => quotedText([{ kind: 'text', text: typed }, { kind: 'quote', text }]))
      },
      attach: content => model.attached.update(list => [...list, ...content]),
      slot: (where, view, order) => slots.add(where, view, order),
      shared: shared.add,
      aside: asides.add,
      placeholder: placeholders.add,
      hold: reason => model.holds.add(reason),
      ...createHandoff(model, () => live()?.editor.focusEnd()),
      sendMenu: menu.add,
      plus: plus.add,
      trigger: triggers.add,
      command: triggers.addCommand,
      settings,
      choose,
      dock: chatDock,
    }

    session.start()
    ctx.watch(draftStore, found => {
      store.set(found)
      if (found) session.start()
    })
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
