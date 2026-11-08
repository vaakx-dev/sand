import { oneLine } from '@sand/util'
import { div, effect, show } from '@vaakx-dev/vrui'
import { streamedMarkdown } from '../integrations/streamed'
import { actionRow, row, tapReveal, workFrame, type RowMaker } from './row'
import { thinkingStep } from './thinking'

export const textRow: RowMaker<'text'> = (item, context) =>
  row(`text:${item.key}`, item, (data, place) => {
    const { copyButton } = context.kit
    const text = data.map(value => value.text)
    const streaming = data.map(value => value.streaming)
    const railed = () => place?.get().railed ?? false
    const node = div({ class: ['leading-relaxed wrap-anywhere', () => (railed() ? 'text-neutral-400' : 'text-neutral-100')], 'data-quote': '' })
    const render = streamedMarkdown(node, context.markdown, context.image)
    effect(() => render(text.get(), streaming.get()))
    const { menus } = context
    const spec = () => ({ title: 'Message', subtitle: oneLine(text.get()).slice(0, 80), actions: context.reply?.(text.get()) ?? [] })
    const press = menus.text(context.menu, spec)
    const reveal = tapReveal()
    return div(
      { class: ['group relative text-sm', () => (railed() ? 'my-1' : 'mt-2 mb-1')], ...press.props, onClick: reveal.onClick },
      div({ class: 'chat-row' }, node),
      show(
        () => !railed() && !streaming.get(),
        () =>
          actionRow(
            () => (place?.get().last ?? false) || reveal.tapped.get(),
            '-ml-1',
            copyButton({ text: () => text.get(), size: 'sm' }),
            show(
              () => spec().actions.length > 0,
              () => menus.more(context.menu, spec),
            ),
          ),
      ),
    )
  })

export const thinkingRow: RowMaker<'thinking'> = (item, context) =>
  row(`thinking:${item.key}`, item, data =>
    workFrame(thinkingStep(context.kit, { streaming: data.map(value => value.streaming), text: data.map(value => value.text), ...context.states.get(item.key) })),
  )
