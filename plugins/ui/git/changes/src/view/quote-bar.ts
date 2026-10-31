import { div, show } from '@vaakx-dev/vrui'
import { quoteText } from '../model/quote-text'
import type { ViewParts } from './parts'

export const quoteBar = ({ kit, model, writer }: ViewParts) => {
  const { selection } = model
  const quote = () => {
    const picked = selection.picked.get()
    const composer = writer.get()
    if (!picked || !composer) return
    composer.quote(quoteText(picked))
    selection.clear()
  }
  const label = () => {
    const count = selection.count.get()
    return `Quote ${count} ${count === 1 ? 'line' : 'lines'} in reply`
  }
  return show(
    () => Boolean(writer.get()) && selection.count.get() > 0,
    () =>
      div(
        { class: [kit.layer.menu, 'pointer-events-none absolute inset-x-0 bottom-4 flex justify-center'] },
        kit.primaryAction({ size: 'sm', class: 'pointer-events-auto shadow-lg', onClick: quote }, kit.icon('reply', 14), label),
      ),
  )
}
