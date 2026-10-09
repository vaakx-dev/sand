import { markdownNodes } from '@sand/conversation'
import { copyButton, div, dynamicChild, effect, fold, shine, show, span } from '@sand/dom'
import { morph } from '../integrations/morph'
import { row, worked, type RowMaker } from './row'

export const textRow: RowMaker<'text'> = item =>
  row(`text:${item.key}`, item, data => {
    const text = data.map(value => value.text)
    const node = div({
      class: [
        'markdown prose text-neutral-300 wrap-anywhere',
        () => (data.get().streaming ? 'transcript-chat-streaming' : ''),
      ],
    })
    effect(() => morph(node, markdownNodes(text.get())))
    return div(
      { class: 'group mb-3 text-sm' },
      node,
      div(
        { class: 'mt-1 flex h-6 items-center opacity-0 group-hover:opacity-100' },
        show(
          data.map(value => !value.streaming),
          () => copyButton({ text: () => text.get(), label: 'Copy' }),
        ),
      ),
    )
  })

export const thinkingRow: RowMaker<'thinking'> = (item, context) =>
  row(`thinking:${item.key}`, item, data => {
    const { open, toggle } = context.states.get(item.key)
    const text = data.map(value => value.text)
    return div(
      { class: 'mb-4' },
      worked(
        toggle,
        open,
        dynamicChild(
          data.map(value => value.streaming),
          live => (live ? shine('Thinking') : span('Thought')),
        ),
      ),
      show(open, () =>
        div(
          { class: 'mt-1 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-neutral-500 ring-1 ring-neutral-800' },
          fold({ lines: () => text.get().split('\n').length, chars: () => text.get().length }, div({ class: 'whitespace-pre-wrap' }, text)),
        ),
      ),
    )
  })
