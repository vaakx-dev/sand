import type { Kit } from '@sand/ui-kit/contract'
import { keys, sig, type Sig } from '@vaakx-dev/vrui'
import { loginServer, type LoginAccount, type ServerDraft } from '../../contract'
import { problem, whileBusy } from '../parts'
import type { LoginControl } from '../state'

const ids = (control: LoginControl) => new Set(control.state.get()?.accounts.map(account => account.id))

const added = (control: LoginControl, before: Set<string>, url: string): LoginAccount | undefined => {
  const servers = control.state.get()?.accounts.filter(account => account.kind === 'server') ?? []
  return servers.find(account => !before.has(account.id)) ?? servers.find(account => account.url === url)
}

export const serverStep = (kit: Kit, control: LoginControl, draft: ServerDraft, saved: () => void) => {
  const { field, primaryAction, sheetStep, textInput } = kit
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
      if (!account) return error.set("Couldn't add the server. Check the URL and try again.")
      id = account.id
      if (account.error) return error.set(account.error)
      saved()
    })

  const submit = () => {
    if (ready()) void save()
  }

  const entry = (value: Sig<string>, placeholder: string, type = 'text') => textInput({ type, placeholder, bindValue: value, onKeyDown: keys({ Enter: submit }) })

  return sheetStep(
    [
      field({ label: 'Name' }, entry(name, 'My box')),
      field({ label: 'URL' }, entry(url, 'http://localhost:8080/v1', 'url')),
      field({ label: 'API key (optional)' }, entry(key, 'Only if the server asks for one', 'password')),
      problem(kit, () => error.get()),
    ],
    primaryAction({ disabled: () => !ready(), onClick: submit }, () => (busy.get() ? 'Checking…' : idleLabel)),
  )
}
