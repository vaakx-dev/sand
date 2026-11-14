import { wordMatches } from '@sand/util'
import { onTimeout } from '@vaakx-dev/vrui'
import type { ChatSpot, ShownChat, ShownChats } from '../contract'
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
  const chats = new Set<ShownChat>()
  const waiting = new Set<(chat: ShownChat) => void>()

  const get = (conversation: string) => [...chats].findLast(chat => chat.conversation === conversation)

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

  const show = async ({ conversation, entry, block, words }: ChatSpot) => {
    const chat = get(conversation) ?? (await arrival(conversation))
    const row = await chat?.reveal(entry, block)
    if (!chat || !row) return false
    const ranges = wordRanges(row, words)
    into(chat.scroller, ranges[0] ?? row)
    flash(ranges)
    return true
  }

  return {
    add(chat) {
      chats.add(chat)
      for (const wake of [...waiting]) wake(chat)
      return () => void chats.delete(chat)
    },
    get,
    show,
  }
}
