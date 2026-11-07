import type { Kit } from '@sand/ui-kit/contract'
import { div, show, sig } from '@vaakx-dev/vrui'
import { loginKinds, type Login, type LoginKind } from '../../contract'
import type { LoginsModel, NewLogin } from './model'
import { editForm, field } from './parts'

export interface AddParts {
  model: LoginsModel
  added(login: Login): void
}

const kinds: Record<LoginKind, { title: string; detail: string }> = {
  website: { title: 'Website login', detail: 'A username and password, and an authenticator key if the site asks for codes' },
  key: { title: 'Key or token', detail: 'An API key, token or other secret that commands use' },
}

const websiteForm = (kit: Kit, save: (login: NewLogin) => Promise<unknown>, cancel: () => void) => {
  const name = sig('')
  const site = sig('')
  const username = sig('')
  const password = sig('')
  const totp = sig('')
  const submit = () => {
    const code = totp.get().trim()
    const where = site.get().trim()
    return save({ kind: 'website', name: name.get().trim() || where, site: where, username: username.get(), password: password.get(), ...(code && { totp: code }) })
  }
  return editForm(
    kit,
    { save: 'Save login', ready: () => Boolean(site.get().trim() && username.get() && password.get()), submit, cancel },
    field(kit, 'Site', { type: 'text', inputMode: 'url', placeholder: 'github.com', bindValue: site, onMount: node => node.focus() }),
    field(kit, 'Name', { type: 'text', placeholder: 'Same as the site', bindValue: name }),
    field(kit, 'Username or email', { type: 'text', autocomplete: 'username', bindValue: username }),
    field(kit, 'Password', { type: 'password', autocomplete: 'current-password', bindValue: password }),
    field(kit, 'Authenticator setup key or otpauth:// link, if the site asks for codes', { type: 'password', bindValue: totp }),
  )
}

const keyForm = (kit: Kit, save: (login: NewLogin) => Promise<unknown>, cancel: () => void) => {
  const name = sig('')
  const value = sig('')
  const submit = () => save({ kind: 'key', name: name.get().trim(), value: value.get() })
  return editForm(
    kit,
    { save: 'Save key', ready: () => Boolean(name.get().trim() && value.get()), submit, cancel },
    field(kit, 'Name', { type: 'text', placeholder: 'GitHub token', bindValue: name, onMount: node => node.focus() }),
    field(kit, 'Value', { type: 'password', bindValue: value }),
  )
}

const forms = { website: websiteForm, key: keyForm }

export const addSection = (kit: Kit, { model, added }: AddParts) => {
  const { rowDetail, secondaryAction, settingsRow, settingsSection } = kit
  const opened = sig<LoginKind | undefined>(undefined)
  const close = () => opened.set(undefined)
  const save = async (login: NewLogin) => {
    const made = await model.add(login)
    close()
    added(made)
  }
  const kindRow = (kind: LoginKind) => {
    const open = opened.map(chosen => chosen === kind)
    return div(
      { class: 'contents' },
      settingsRow(
        { title: kinds[kind].title, detail: kinds[kind].detail },
        show(
          () => !open.get(),
          () => secondaryAction({ size: 'sm', onClick: () => opened.set(kind) }, 'Add'),
        ),
      ),
      show(open, () => rowDetail(forms[kind](kit, save, close))),
    )
  }
  return settingsSection({ title: 'Add' }, ...loginKinds.map(kindRow))
}
