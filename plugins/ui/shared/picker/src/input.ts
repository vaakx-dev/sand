import type { Kit } from '@sand/ui-kit/contract'
import { form, keys, preventThen, sig } from '@vaakx-dev/vrui'
import { openSheet } from './overlay'

export const ask = (kit: Kit, cancels: Set<() => void>, title: string, value = '') =>
  new Promise<string | undefined>(resolve => {
    const { primaryAction, secondaryAction, sheetBody, sheetFoot, textInput } = kit
    const text = sig(value)
    const finish = (answer?: string) => {
      cancels.delete(cancel)
      close()
      resolve(answer)
    }
    const cancel = () => finish()
    cancels.add(cancel)
    const close = openSheet(
      kit,
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
