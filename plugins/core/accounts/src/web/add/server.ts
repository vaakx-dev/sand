import type { Kit } from '@sand/ui-kit/contract'
import { keys, label, sig, type Sig } from '@vaakx-dev/vrui'
import { loginServer, type LoginAccount, type ServerDraft } from '../../contract'
import { problem, whileBusy } from '../parts'
import type { LoginControl } from '../state'

const ids = (control: LoginControl) => new Set(control.state.get()?.accounts.map(account => account.id))

const added = (control: LoginControl, before: Set<string>, url: string): LoginAccount | undefined => {
  const servers = control.state.get()?.accounts.filter(account => account.kind === 'server') ?? []
  return servers.find(account => !before.has(account.id)) ?? servers.find(account => account.url === url)
}

export const serverStep = (kit: Kit, control: LoginControl, draft: ServerDraft, saved: () => void) => {
  const { primaryAction, sheetStep, textInput } = kit
  const name = sig(draft.name)
  const url = sig(draft.url)
  const key = sig('')
  const busy = sig(false)
  const error = sig('')
  let id = draft.id
  const idleLabel = draft.id ? 'Save' : 'Add'
  const ready = () => !busy.get() && !!name.get().trim() && !!url.get().trim()

  const save = () =>
    whileBusy(busy, async () => {
      error.set('')
      const before = ids(control)
      const target = url.get().trim()
      await control.run(loginServer, {
        ...(id && { id }),
        name: name.get().trim(),
        url: target,
        ...(key.get().trim() && { key: key.get().trim() }),
        ...(draft.provider && { provider: draft.provider }),
      })
      const account = id ? control.account(id) : added(control, before, target)
      if (!account) return error.set('The server was not added')
      id = account.id
      if (account.error) return error.set(account.error)
      saved()
    })

  const submit = () => {
    if (ready()) void save()
  }

  const field = (value: Sig<string>, placeholder: string, title: string, type = 'text') =>
    label({ class: 'flex flex-col gap-1 text-xs text-neutral-400' }, title, textInput({ type, placeholder, bindValue: value, onKeyDown: keys({ Enter: submit }) }))

  return sheetStep(
    [
      field(name, 'My box', 'Name'),
      field(url, 'http://localhost:8080/v1', 'URL', 'url'),
      field(key, 'Only if the server asks for one', 'API key (optional)', 'password'),
      problem(kit, () => error.get()),
    ],
    primaryAction({ disabled: () => !ready(), onClick: submit }, () => (busy.get() ? 'Checking…' : idleLabel)),
  )
}
