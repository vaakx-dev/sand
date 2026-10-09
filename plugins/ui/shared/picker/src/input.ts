import { div, form, keys, preventThen, primaryAction, secondaryAction, sig, textInput } from '@sand/dom'
import { openSheet } from './overlay'

export const ask = (cancels: Set<() => void>, title: string, value = '') =>
  new Promise<string | undefined>(resolve => {
    const text = sig(value)
    const finish = (answer?: string) => {
      cancels.delete(cancel)
      close()
      resolve(answer)
    }
    const cancel = () => finish()
    cancels.add(cancel)
    const close = openSheet(
      title,
      cancel,
      keys({ Escape: cancel }, { stop: true }),
      form(
        { class: 'flex flex-col', onSubmit: preventThen(() => finish(text.get())) },
        div(
          { class: 'px-4 pt-2 pb-1' },
          textInput({
            bindValue: text,
            onMount: node => {
              node.focus()
              node.select()
            },
          }),
        ),
        div({ class: 'flex justify-end gap-2 px-4 pt-3 pb-4' }, secondaryAction({ onClick: cancel }, 'Cancel'), primaryAction({ type: 'submit' }, 'Save')),
      ),
    )
  })
