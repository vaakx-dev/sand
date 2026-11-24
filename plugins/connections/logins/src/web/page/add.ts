import { settingMark } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, sig, type FlowNode } from '@vaakx-dev/vrui'
import { externalSources, loginKinds, type External, type Login, type LoginKind } from '../../contract'
import { managers } from './managers/catalog'
import { pickRows } from './managers/pick'
import type { LoginsModel, NewLogin } from './model'
import { editForm } from './parts'

export interface AddParts {
  model: LoginsModel
  added(login: Login): void
}

type Adding = LoginKind | External

const kindTitles: Record<LoginKind, string> = { website: 'Website login', key: 'Key or token' }

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
    kit.field({ label: 'Site' }, kit.textInput({ type: 'text', inputMode: 'url', placeholder: 'github.com', bindValue: site, onMount: node => node.focus() })),
    kit.field({ label: 'Name' }, kit.textInput({ type: 'text', placeholder: 'Same as the site', bindValue: name })),
    kit.field({ label: 'Username or email' }, kit.textInput({ type: 'text', autocomplete: 'username', bindValue: username })),
    kit.field({ label: 'Password' }, kit.textInput({ type: 'password', autocomplete: 'current-password', bindValue: password })),
    kit.field({ label: 'Authenticator setup key or otpauth:// link' }, kit.textInput({ type: 'password', placeholder: 'Only if the site asks for codes', bindValue: totp })),
  )
}

const keyForm = (kit: Kit, save: (login: NewLogin) => Promise<unknown>, cancel: () => void) => {
  const name = sig('')
  const value = sig('')
  const submit = () => save({ kind: 'key', name: name.get().trim(), value: value.get() })
  return editForm(
    kit,
    { save: 'Save key', ready: () => Boolean(name.get().trim() && value.get()), submit, cancel },
    kit.field({ label: 'Name' }, kit.textInput({ type: 'text', placeholder: 'GitHub token', bindValue: name, onMount: node => node.focus() })),
    kit.field({ label: 'Value' }, kit.textInput({ type: 'password', bindValue: value })),
  )
}

const forms = { website: websiteForm, key: keyForm }

export const addSection = (kit: Kit, { model, added }: AddParts) => {
  const { rowDetail, secondaryAction, settingsRow, settingsSection } = kit
  const opened = sig<Adding | undefined>(undefined)
  const close = () => opened.set(undefined)
  const finish = (made: Login) => {
    close()
    added(made)
  }
  const save = async (login: NewLogin) => finish(await model.add(login))
  const addRow = (adding: Adding, title: string, body: () => FlowNode) => {
    const open = opened.map(chosen => chosen === adding)
    return div(
      { class: 'contents' },
      settingsRow(
        { ...settingMark(`add-${adding}`), title },
        show(
          () => !open.get(),
          () => secondaryAction({ size: 'sm', onClick: () => opened.set(adding) }, 'Add'),
        ),
      ),
      show(open, body),
    )
  }
  const ready = (source: External) => model.state.get()?.sources[source].status === 'ready'
  return settingsSection(
    { title: 'Add' },
    ...loginKinds.map(kind => addRow(kind, kindTitles[kind], () => rowDetail(forms[kind](kit, save, close)))),
    ...externalSources.map(source =>
      show(
        () => ready(source),
        () => addRow(source, `From ${managers[source].name}`, () => pickRows(kit, model, source, finish, close)),
      ),
    ),
  )
}
