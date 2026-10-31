import { place } from '@sand/layout/place'
import { sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { Shown } from '../shown'

export const editSheet = (shown: Shown) => {
  const { kit, ctx } = shown.parts
  const pull = shown.pull()
  const title = sig(pull.title)
  const body = sig(pull.body)
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const save = async () => {
    const text = { ...(title.get().trim() !== pull.title && { title: title.get().trim() }), ...(body.get() !== pull.body && { body: body.get() }) }
    if (!Object.keys(text).length) return close()
    if (await shown.actions.edit(text)) close()
  }
  unplace = place(
    ctx,
    'overlay',
    () =>
      kit.overlay(
        close,
        kit.sheet(
          { 'aria-label': 'Edit pull request', size: 'md' },
          kit.sheetHead({ title: `Edit #${pull.number}`, close }),
          kit.sheetBody(
            {},
            kit.textInput({ bindValue: title, placeholder: 'Title', 'aria-label': 'Title' }),
            kit.textArea({ bindValue: body, placeholder: 'Description', 'aria-label': 'Description', rows: 12 }),
          ),
          kit.sheetFoot(
            kit.quietButton({ surface: 'raised', onClick: close }, 'Cancel'),
            kit.primaryAction({ disabled: () => !title.get().trim() || shown.model.busy.get(), onClick: () => void save() }, 'Save'),
          ),
        ),
      ),
    100,
  )
}
