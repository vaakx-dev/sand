import type { Kit } from '@sand/ui-kit/contract'
import { div, list, onDisconnect, sig, untrack } from '@vaakx-dev/vrui'
import { segmentField } from './field'
import { quoteRow } from './quote'
import type { Caret, Segment, Segments, TextSegment } from './segments'

export interface EditorOptions {
  placeholder: () => string
  keydown(event: KeyboardEvent): void
  paste(event: ClipboardEvent): void
}

const caretOf = (id: number, field: HTMLTextAreaElement): Caret => ({ id, start: field.selectionStart, end: field.selectionEnd })

export const createEditor = (kit: Kit, segments: Segments, options: EditorOptions) => {
  const fields = new Map<number, HTMLTextAreaElement>()
  const focused = sig<number | undefined>(undefined)
  let caret: Caret | undefined

  const place = (at: Caret | undefined) => {
    if (!at) return
    caret = at
    focused.set(at.id)
    const field = fields.get(at.id)
    field?.focus()
    field?.setSelectionRange(at.start, at.end)
  }

  const lastEnd = () => segments.endOf(segments.texts().at(-1))
  const partOf = (at: Caret | undefined) => segments.texts().find(part => part.id === at?.id)
  const current = () => (partOf(caret) ? caret : lastEnd())
  const active = () => [...fields.values()].find(field => field === document.activeElement)

  const direction = (event: KeyboardEvent, field: HTMLTextAreaElement) => {
    if (event.key === 'ArrowUp' && field.selectionStart === 0) return -1
    if (event.key === 'ArrowDown' && field.selectionEnd === field.value.length) return 1
    return 0
  }

  const navigate = (part: TextSegment, event: KeyboardEvent) => {
    const field = event.currentTarget
    if (!(field instanceof HTMLTextAreaElement) || field.selectionStart !== field.selectionEnd) return
    const quote = event.key === 'Backspace' && field.selectionStart === 0 ? segments.quoteBefore(part.id) : undefined
    if (quote) {
      event.preventDefault()
      return place(segments.unquote(quote.id))
    }
    const step = direction(event, field)
    const target = step ? segments.neighbour(part.id, step) : undefined
    if (!target) return
    event.preventDefault()
    place(step < 0 ? segments.endOf(target) : { id: target.id, start: 0, end: 0 })
  }

  const keydown = (part: TextSegment) => (event: KeyboardEvent) => {
    options.keydown(event)
    if (!event.defaultPrevented && !event.isComposing) navigate(part, event)
  }

  const isLast = (part: TextSegment) => segments.texts().at(-1) === part

  const textRow = (part: TextSegment) => {
    const field = segmentField(part, {
      placeholder: () => (segments.segments.get().length === 1 ? options.placeholder() : ''),
      hidden: () => !part.value.get() && focused.get() !== part.id && !isLast(part),
      keydown: keydown(part),
      paste: options.paste,
      focus: () => focused.set(part.id),
      blur: () => {
        if (focused.get() === part.id) focused.set(undefined)
      },
      moved: moved => {
        caret = caretOf(part.id, moved)
      },
    })
    fields.set(part.id, field)
    onDisconnect(field, () => fields.delete(part.id))
    return field
  }

  const row = (part: Segment) =>
    part.kind === 'text' ? textRow(part) : quoteRow(kit, part, { reply: () => place(segments.startAfter(part.id)), remove: () => place(segments.unquote(part.id)) })

  const node = list(
    segments.segments,
    part => part.id,
    part => row(untrack(() => part.get())),
    div({ class: 'max-h-64 overflow-y-auto' }),
  )

  const insert = (text: string) => {
    const at = current()
    const part = partOf(at)
    if (!at || !part) return
    const value = part.value.get()
    part.value.set(value.slice(0, at.start) + text + value.slice(at.end))
    const end = at.start + text.length
    caret = { id: at.id, start: end, end }
    fields.get(at.id)?.setSelectionRange(end, end)
  }

  return {
    node,
    active,
    insert,
    focus: () => place(current()),
    focusEnd: () => place(lastEnd()),
    quote: (text: string) => place(segments.quote(text, current())),
  }
}
