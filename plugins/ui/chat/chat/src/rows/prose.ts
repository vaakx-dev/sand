import { oneLine } from '@sand/util'
import { div, effect, show, span } from '@vaakx-dev/vrui'
import { streamedMarkdown } from '../integrations/streamed'
import { actionRow, row, workFrame, type RowMaker } from './row'
import { thinkingCard } from './thinking'

export const textRow: RowMaker<'text'> = (item, context) =>
  row(`text:${item.key}`, item, (data, railed) => {
    const { copyButton } = context.kit
    const text = data.map(value => value.text)
    const streaming = data.map(value => value.streaming)
    const node = div({ class: ['leading-relaxed wrap-anywhere', () => (railed?.get() ? 'text-neutral-400' : 'text-neutral-100')], 'data-quote': '' })
    const render = streamedMarkdown(node, context.markdown, context.images(item.at))
    effect(() => render(text.get(), streaming.get()))
    const { menus } = context.parts
    const spec = () => ({ title: 'Message', subtitle: oneLine(text.get()).slice(0, 80), actions: context.reply(text.get()) })
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
              () =>
                span(
                  { class: 'flex items-center gap-1' },
                  copyButton({ text: () => text.get(), size: 'sm' }),
                  show(
                    () => spec().actions.length > 0,
                    () => menus.more(context.menu, spec),
                  ),
                ),
            ),
          ),
      ),
    )
  })

export const thinkingRow: RowMaker<'thinking'> = (item, context) =>
  row(`thinking:${item.key}`, item, data =>
    workFrame(thinkingCard(context.kit, { streaming: data.map(value => value.streaming), text: data.map(value => value.text), ...context.states.get(item.key) })),
  )
