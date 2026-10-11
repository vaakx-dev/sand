import { copyButton, div, dynamicChild, effect, fold, shine, show, span } from '@sand/dom'
import { streamedMarkdown } from '../integrations/streamed'
import { actionRow, row, worked, type RowMaker } from './row'

export const textRow: RowMaker<'text'> = (item, context) =>
  row(`text:${item.key}`, item, data => {
    const text = data.map(value => value.text)
    const streaming = data.map(value => value.streaming)
    const node = div({ class: ['markdown prose text-neutral-300 wrap-anywhere', () => (streaming.get() ? 'transcript-chat-streaming' : '')], 'data-quote': '' })
    const render = streamedMarkdown(node, context.markdown)
    effect(() => render(text.get(), streaming.get()))
    const { menus } = context.parts
    const spec = () => ({ title: 'Reply', actions: [menus.copy('copy', 'Copy text', () => text.get(), 'text'), ...context.reply(text.get())] })
    const press = menus.text(context.menu, spec)
    return div(
      { class: 'group mb-3 text-sm', ...press.props },
      node,
      actionRow(
        'transcript-chat-copy mt-1',
        show(
          () => !streaming.get(),
          () => span({ class: 'flex items-center gap-1' }, copyButton({ text: () => text.get(), label: 'Copy' }), menus.more(context.menu, spec)),
        ),
      ),
    )
  })

export const thinkingRow: RowMaker<'thinking'> = (item, context) =>
  row(`thinking:${item.key}`, item, data => {
    const { open, toggle } = context.states.get(item.key)
    const text = data.map(value => value.text)
    const label = dynamicChild(
      data.map(value => value.streaming),
      live => (live ? shine('Thinking') : span('Thought')),
    )
    return div(
      { class: 'mb-4' },
      worked(toggle, open, label),
      show(open, () =>
        div(
          { class: 'mt-1 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-neutral-500 ring-1 ring-neutral-800' },
          fold({ lines: () => text.get().split('\n').length, chars: () => text.get().length }, div({ class: 'whitespace-pre-wrap' }, text)),
        ),
      ),
    )
  })
