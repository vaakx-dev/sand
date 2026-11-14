import { threadPcs, wire } from '@sand/devices-contract'
import { keys } from '@sand/keys/contract'
import { palette } from '@sand/palette/contract'
import { shownChats, type ShownChat } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { collectScope, disposeAll, effect, onTimeout, portal, registerInScope, untrack, type Disposer } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { chatFind, chatFinder, type FindAt } from '../contract'
import { findBar, type FindBar } from './bar'
import { type Ask, Finder } from './finder'
import { watchChanges } from './integrations/changes'
import { css } from './style'

interface Opened {
  chat: ShownChat
  finder: Finder
  bar: FindBar
  scope: Disposer[]
}

const REFRESH_MS = 300
const LABEL = 'Find in chat'
const OWN_EDITORS = '[data-part="composer"], [data-part="find-bar"]'

const coveredPx = (bar: Element, scroller: Element) => Math.max(0, bar.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top)

const throttled = (run: () => void, owner: Node) => {
  let waiting = false
  return () => {
    if (waiting) return
    waiting = true
    onTimeout(
      () => {
        waiting = false
        run()
      },
      REFRESH_MS,
      owner,
    )
  }
}

export default definePlugin({
  name: 'chat-find-web',
  description: 'The find bar over the chat on screen: mod+f, the chat menu and Search open it; it counts the words, steps through them and opens the history and folded turns they are in',
  inject: { kit, wire, shownChats },
  apply(ctx) {
    ctx.kit.style(ctx, css)
    let opened: Opened | undefined

    const close = () => {
      if (opened) disposeAll(opened.scope)
      opened = undefined
    }

    const pcOf = ({ owner, conversation }: ShownChat) => (owner === 'thread' ? ctx.get(threadPcs)?.ofSession(conversation) : undefined)

    const askOn =
      (chat: ShownChat): Ask =>
      (query, before) =>
        ctx.wire.call(chatFind, { owner: chat.owner, chat: chat.conversation, query, ...(before && { before }) }, pcOf(chat))

    const start = (chat: ShownChat): Opened => {
      const { value, scope } = collectScope(() => {
        const finder = new Finder({ chat, ask: askOn(chat), coveredPx: () => coveredPx(bar.view, chat.scroller) })
        const bar = findBar({ kit: ctx.kit, finder, close })
        portal(chat.frame, bar.view)
        watchChanges(chat.scroller, throttled(() => finder.refresh(), bar.view))
        registerInScope(() => finder.close())
        return { chat, finder, bar }
      })
      return { ...value, scope }
    }

    const on = (chat: ShownChat) => {
      if (opened?.chat !== chat) {
        close()
        opened = start(chat)
      }
      return opened
    }

    const open = async (conversation: string, at?: FindAt) => {
      const chat = await ctx.shownChats.arrived(conversation)
      if (!chat) return
      const { bar, finder } = on(chat)
      bar.focus()
      if (!at) return
      bar.show(at.query)
      await finder.find(at.query, at)
    }

    const openHere = () => {
      const chat = ctx.shownChats.current()
      if (chat) void open(chat.conversation)
    }

    const ownKeys = (event: KeyboardEvent) => !ctx.kit.gesture.editing(event.target) || (event.target instanceof Element && event.target.closest(OWN_EDITORS) !== null)

    const findable = (event: KeyboardEvent) => ctx.shownChats.current() !== undefined && !ctx.kit.hasOpenLayer() && ownKeys(event)

    ctx.provide(chatFinder, { open: (conversation, at) => void open(conversation, at) })
    ctx.effect(() => ctx.shownChats.action({ id: 'find', label: LABEL, icon: 'search', run: conversation => void open(conversation) }))
    ctx.effect(() =>
      effect(() => {
        const chat = ctx.shownChats.current()
        if (opened && opened.chat !== chat) untrack(close)
      }),
    )
    ctx.effect(() => close)
    ctx.watch(keys, found => found?.bind({ key: 'mod+f', when: findable, run: openHere }))
    ctx.watch(palette, found =>
      found?.source({
        id: 'chat-find',
        order: 5,
        items: () => (ctx.shownChats.current() ? [{ id: 'chat-find', group: 'Actions', icon: 'search', label: 'Find in this chat', search: 'find search words', run: openHere }] : []),
      }),
    )
  },
})
