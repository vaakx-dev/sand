import { div, keys, label, primaryAction, sig, textInput } from '@sand/dom'
import type { LoginAccount, ServerDraft } from '../../contract'
import { actions, busyAction, problem } from '../parts'
import type { LoginControl } from '../state'

const ids = (control: LoginControl) => new Set(control.state.get()?.accounts.map(account => account.id))

const added = (control: LoginControl, before: Set<string>, url: string): LoginAccount | undefined => {
  const servers = control.state.get()?.accounts.filter(account => account.kind === 'server') ?? []
  return servers.find(account => !before.has(account.id)) ?? servers.find(account => account.url === url)
}

export const serverStep = (control: LoginControl, draft: ServerDraft, saved: (name: string) => void) => {
  const name = sig(draft.name)
  const url = sig(draft.url)
  const key = sig('')
  const busy = sig(false)
  const error = sig('')
  let id = draft.id
  const ready = () => !busy.get() && !!name.get().trim() && !!url.get().trim()
  const onEnter = keys({ Enter: () => ready() && void save() })

  const save = busyAction(busy, async () => {
    error.set('')
    const before = ids(control)
    const target = url.get().trim()
    await control.run({
      type: 'login.server',
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
    saved(account.label)
  })

  const field = (value: typeof name, placeholder: string, title: string, type = 'text') =>
    label({ class: 'flex flex-col gap-1 text-xs text-neutral-400' }, title, textInput({ class: 'bg-neutral-900', type, placeholder, bindValue: value, onKeyDown: onEnter }))

  return div(
    { class: 'flex flex-col gap-4' },
    field(name, 'My box', 'Name'),
    field(url, 'http://localhost:8080/v1', 'URL', 'url'),
    field(key, 'Only if the server asks for one', 'API key (optional)', 'password'),
    problem(() => error.get()),
    actions(primaryAction({ disabled: () => !ready(), onClick: () => void save() }, () => (busy.get() ? 'Checking…' : draft.id ? 'Save' : 'Add'))),
  )
}
