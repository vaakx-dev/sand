import { copyButton, div, effect, show, span } from '@sand/dom'
import { streamedMarkdown } from '../integrations/streamed'
import { actionRow, row, type RowMaker } from './row'
import { thinkingCard } from './thinking'

export const textRow: RowMaker<'text'> = (item, context) =>
  row(`text:${item.key}`, item, (data, railed) => {
    const text = data.map(value => value.text)
    const streaming = data.map(value => value.streaming)
    const node = div({ class: ['leading-relaxed text-neutral-300 wrap-anywhere', () => (streaming.get() ? '*:animate-fade' : '')], 'data-quote': '' })
    const render = streamedMarkdown(node, context.markdown, context.images())
    effect(() => render(text.get(), streaming.get()))
    const { menus } = context.parts
    const spec = () => ({ title: 'Reply', actions: [menus.copy('copy', 'Copy', () => text.get(), 'text'), ...context.reply(text.get())] })
    const press = menus.text(context.menu, spec)
    return div(
      { class: 'group mb-3 text-sm', ...press.props },
      node,
      show(
        () => !railed?.get(),
        () =>
          actionRow(
            'mt-1',
            show(
              () => !streaming.get(),
              () => span({ class: 'flex items-center gap-1' }, copyButton({ text: () => text.get(), label: 'Copy' }), menus.more(context.menu, spec)),
            ),
          ),
      ),
    )
  })

export const thinkingRow: RowMaker<'thinking'> = (item, context) =>
  row(`thinking:${item.key}`, item, data =>
    div(
      { class: 'mb-3' },
      thinkingCard({ streaming: data.map(value => value.streaming), text: data.map(value => value.text), ...context.states.get(item.key) }),
    ),
  )
