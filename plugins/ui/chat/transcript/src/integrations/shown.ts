import { wordMatches } from '@sand/util'
import { onTimeout, sig, untrack } from '@vaakx-dev/vrui'
import type { ChatAction, ChatSpot, ShownChat, ShownChats } from '../contract'
import { textNodes, type Flash } from './flash'

const ARRIVAL_WAIT_MS = 4000

const wordRanges = (row: Element, words: string[]) =>
  textNodes(row).flatMap(node =>
    wordMatches(node.data, words).map(([start, end]) => {
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)
      return range
    }),
  )

const into = (scroller: HTMLElement, target: Range | Element) => {
  const box = scroller.getBoundingClientRect()
  const rect = target.getBoundingClientRect()
  if (rect.top >= box.top && rect.bottom <= box.bottom) return
  const centered = rect.top + rect.height / 2 - (box.top + box.height / 2)
  scroller.scrollTop += Math.min(rect.top - box.top, centered)
}

export const createShownChats = (flash: Flash): ShownChats => {
  const chats = sig<ShownChat[]>([])
  const actions = sig<ChatAction[]>([])
  const waiting = new Set<(chat: ShownChat) => void>()

  const get = (conversation: string) => untrack(() => chats.get()).findLast(chat => chat.conversation === conversation)

  const arrival = (conversation: string) =>
    new Promise<ShownChat | undefined>(resolve => {
      const finish = (chat?: ShownChat) => {
        waiting.delete(wake)
        stop()
        resolve(chat)
      }
      const wake = (chat: ShownChat) => {
        if (chat.conversation === conversation) finish(chat)
      }
      const stop = onTimeout(finish, ARRIVAL_WAIT_MS)
      waiting.add(wake)
    })

  const arrived = async (conversation: string) => get(conversation) ?? (await arrival(conversation))

  const show = async ({ conversation, entry, block, words }: ChatSpot) => {
    const chat = await arrived(conversation)
    const row = await chat?.reveal(entry, block)
    if (!chat || !row) return false
    const ranges = wordRanges(row, words)
    into(chat.scroller, ranges[0] ?? row)
    flash(ranges)
    return true
  }

  return {
    add(chat) {
      chats.update(list => [...list, chat])
      for (const wake of [...waiting]) wake(chat)
      return () => chats.update(list => list.filter(shown => shown !== chat))
    },
    current: () => chats.get().at(-1),
    arrived,
    show,
    action(action) {
      actions.update(list => [...list, action])
      return () => actions.update(list => list.filter(added => added !== action))
    },
    actions: () => actions.get(),
  }
}
