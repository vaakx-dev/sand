import { batch, derive, effect, sig, untrack, type Sig } from '@sand/dom'
import { quoteBlocks, quotedText, type QuoteBlock } from '@sand/kit'

export interface TextSegment {
  id: number
  kind: 'text'
  value: Sig<string>
}

export interface QuoteSegment {
  id: number
  kind: 'quote'
  text: string
}

export type Segment = TextSegment | QuoteSegment

export interface Caret {
  id: number
  start: number
  end: number
}

export const createSegments = (text: Sig<string>) => {
  let next = 0
  const textPart = (value: string): TextSegment => ({ id: next++, kind: 'text', value: sig(value) })
  const quotePart = (quoted: string): QuoteSegment => ({ id: next++, kind: 'quote', text: quoted })

  const parse = (value: string) => {
    const parts: Segment[] = []
    for (const block of quoteBlocks(value)) {
      if (block.kind === 'quote' && parts.at(-1)?.kind !== 'text') parts.push(textPart(''))
      parts.push(block.kind === 'quote' ? quotePart(block.text) : textPart(block.text))
    }
    if (parts.at(-1)?.kind !== 'text') parts.push(textPart(''))
    return parts
  }

  const blockOf = (part: Segment): QuoteBlock => (part.kind === 'text' ? { kind: 'text', text: part.value.get() } : { kind: 'quote', text: part.text })

  const join = (parts: Segment[]) => {
    const [only] = parts
    if (parts.length === 1 && only?.kind === 'text') return only.value.get()
    return quotedText(parts.map(blockOf))
  }

  const segments = sig(parse(text.get()))
  const joined = derive(() => join(segments.get()))
  let written = text.get()

  effect(() => {
    const value = text.get()
    if (value === written) return
    written = value
    untrack(() => segments.set(parse(value)))
  })

  effect(() => {
    const value = joined.get()
    if (value === written) return
    written = value
    untrack(() => text.set(value))
  })

  const texts = () => segments.get().filter((part): part is TextSegment => part.kind === 'text')

  const find = (id: number) => segments.get().findIndex(part => part.id === id)

  const endOf = (part: TextSegment | undefined): Caret | undefined => part && { id: part.id, start: part.value.get().length, end: part.value.get().length }

  const quote = (quoted: string, at = endOf(texts().at(-1))): Caret | undefined => {
    const list = segments.get()
    const index = at ? find(at.id) : -1
    const target = list[index]
    if (!at || target?.kind !== 'text') return undefined
    const value = target.value.get()
    const after = textPart(value.slice(at.end).trimStart())
    batch(() => {
      target.value.set(value.slice(0, at.start).trimEnd())
      segments.set([...list.slice(0, index + 1), quotePart(quoted.trim()), after, ...list.slice(index + 1)])
    })
    return { id: after.id, start: 0, end: 0 }
  }

  const unquote = (id: number): Caret | undefined => {
    const list = segments.get()
    const index = find(id)
    const before = list[index - 1]
    const after = list[index + 1]
    if (before?.kind !== 'text' || after?.kind !== 'text') return undefined
    const head = before.value.get()
    const tail = after.value.get()
    const gap = head && tail ? '\n' : ''
    batch(() => {
      before.value.set(head + gap + tail)
      segments.set([...list.slice(0, index), ...list.slice(index + 2)])
    })
    const caret = head.length + gap.length
    return { id: before.id, start: caret, end: caret }
  }

  const neighbour = (id: number, step: 1 | -1) => {
    const list = texts()
    return list[list.findIndex(part => part.id === id) + step]
  }

  const quoteBefore = (id: number) => {
    const before = segments.get()[find(id) - 1]
    return before?.kind === 'quote' ? before : undefined
  }

  const startAfter = (id: number): Caret | undefined => {
    const after = segments.get()[find(id) + 1]
    return after?.kind === 'text' ? { id: after.id, start: 0, end: 0 } : undefined
  }

  return { segments, texts, quote, unquote, neighbour, quoteBefore, startAfter, endOf }
}

export type Segments = ReturnType<typeof createSegments>
