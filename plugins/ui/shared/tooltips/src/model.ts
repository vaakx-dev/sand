import { onRaf, onTimeout, sig, untrack } from '@sand/dom'
import { elementAt } from './integrations/spot'
import { adoptTitles, tipOf } from './integrations/titles'

type Source = 'pointer' | 'focus'

export interface Tip {
  anchor: Element
  text: string
  round: number
}

const delay = 500
const warm = 300
const longest = 400

const clip = (text: string) => (text.length > longest ? `${text.slice(0, longest)}…` : text)

const inside = (node: Element | undefined, target: EventTarget | null) => Boolean(node && target instanceof Node && node.contains(target))

export type TooltipModel = ReturnType<typeof tooltipModel>

export const tooltipModel = () => {
  const tip = sig<Tip | undefined>(undefined)
  let rounds = 0
  let anchor: Element | undefined
  let source: Source | undefined
  let pressed: Element | undefined
  let point: { x: number; y: number } | undefined
  let wait: (() => void) | undefined
  let frame: (() => void) | undefined
  let closedAt = 0

  const shown = () => untrack(() => tip.get()) !== undefined

  const reveal = (fresh: boolean) => {
    wait = undefined
    const text = anchor?.isConnected ? tipOf(anchor) : ''
    if (!anchor || !text) return tip.set(undefined)
    if (fresh) rounds++
    tip.set({ anchor, text: clip(text), round: rounds })
  }

  const close = () => {
    wait?.()
    wait = undefined
    if (shown()) closedAt = Date.now()
    tip.set(undefined)
    anchor = undefined
    source = undefined
  }

  const dismiss = (target: Element | null) => {
    pressed = anchor ?? target ?? undefined
    close()
    closedAt = 0
  }

  const open = (next: Element | null, from: Source) => {
    if (next && next === anchor) return
    close()
    if (!next || next === pressed) return
    anchor = next
    source = from
    if (from === 'focus' || Date.now() - closedAt < warm) reveal(true)
    else wait = onTimeout(() => reveal(true), delay)
  }

  const hover = (target: Element) => {
    adoptTitles(target)
    const next = target.closest('[data-tip]')
    if (next || source === 'pointer') open(next, 'pointer')
  }

  const underPointer = () => {
    frame = undefined
    const target = point && elementAt(point)
    if (target && source !== 'focus') hover(target)
  }

  return {
    tip,
    close,
    track(at: { x: number; y: number }) {
      point = at
    },
    over(target: Element, at: { x: number; y: number }) {
      point = at
      hover(target)
    },
    out(related: EventTarget | null) {
      if (!related) point = undefined
      if (pressed && !inside(pressed, related)) pressed = undefined
      if (source === 'pointer' && !inside(anchor, related)) close()
    },
    press(target: Element | null) {
      dismiss(target?.closest('[data-tip]') ?? null)
    },
    focus(target: Element) {
      if (!target.matches(':focus-visible')) return
      adoptTitles(target)
      open(target.hasAttribute('data-tip') ? target : null, 'focus')
    },
    blur(target: EventTarget | null) {
      if (target === pressed && source !== 'pointer') pressed = undefined
      if (source === 'focus' && target === anchor) close()
    },
    activate(target: EventTarget | null) {
      if (source === 'focus' && inside(anchor, target)) dismiss(null)
    },
    escape() {
      if (shown()) dismiss(null)
    },
    scrolled(target: EventTarget | null) {
      if (target instanceof Node && anchor && target.contains(anchor)) close()
    },
    changed(retitled: Element[], moved: boolean) {
      for (const target of retitled) adoptTitles(target)
      if (anchor && !anchor.isConnected) close()
      else if (anchor && shown() && retitled.length) reveal(false)
      if (point && moved && !frame) frame = onRaf(underPointer)
    },
    stop() {
      close()
      frame?.()
    },
  }
}
