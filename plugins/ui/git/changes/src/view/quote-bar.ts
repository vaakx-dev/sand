import { div, show } from '@vaakx-dev/vrui'
import { quoteText } from '../model/quote-text'
import type { ViewParts } from './parts'

export const quoteBar = ({ kit, model, writer }: ViewParts) => {
  const { selection } = model
  const count = () => selection.range.get()?.lines.length ?? 0
  const quote = () => {
    const range = selection.range.get()
    const composer = writer.get()
    if (!range || !composer) return
    composer.quote(quoteText(range))
    selection.clear()
  }
  const label = () => `Quote ${count()} ${count() === 1 ? 'line' : 'lines'} in reply`
  return show(
    () => Boolean(writer.get()) && count() > 0,
    () =>
      div(
        { class: [kit.layer.menu, 'pointer-events-none absolute inset-x-0 bottom-4 flex justify-center'] },
        kit.primaryAction({ size: 'sm', class: 'pointer-events-auto shadow-lg', onClick: quote }, kit.icon('reply', 14), label),
      ),
  )
}
