import { form, keys, preventThen, primaryAction, secondaryAction, sheetBody, sheetFoot, sig, textInput } from '@sand/dom'
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
      { title, size: 'md', close: cancel, keydown: keys({ Escape: cancel }, { stop: true }) },
      form(
        { class: 'flex min-h-0 flex-col', onSubmit: preventThen(() => finish(text.get())) },
        sheetBody(
          {},
          textInput({
            'aria-label': title,
            bindValue: text,
            onMount: node => {
              node.focus()
              node.select()
            },
          }),
        ),
        sheetFoot(secondaryAction({ onClick: cancel }, 'Cancel'), primaryAction({ type: 'submit' }, 'Save')),
      ),
    )
  })
