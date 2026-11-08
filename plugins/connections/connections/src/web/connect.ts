import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, label, show, sig, type Child, type Sig } from '@vaakx-dev/vrui'
import type { Field, KindInfo, Setup } from '../contract'
import type { ConnectionsModel } from './model'

const stack = (...children: Child[]) => div({ class: 'flex max-w-md flex-col gap-3' }, ...children)

const actions = (...children: Child[]) => div({ class: 'flex flex-wrap items-center gap-3' }, ...children)

const problem = ({ errorText }: Kit, model: ConnectionsModel) => show(() => !!model.error.get(), () => errorText(() => model.error.get()))

const howTo = ({ linkButton, openTab }: Kit, url: string) => linkButton({ onClick: () => openTab(url) }, 'How to')

const field = ({ metaLine, textInput }: Kit, { label: name, secret, placeholder }: Field, value: Sig<string>) =>
  label({ class: 'flex min-w-0 flex-col gap-1' }, metaLine(name), textInput({ type: secret ? 'password' : 'text', placeholder: placeholder ?? '', bindValue: value }))

const clientStep = (kit: Kit, model: ConnectionsModel, kind: KindInfo, setup: Setup, done: () => void) => {
  const { primaryAction, secondaryAction, sheetText } = kit
  const id = sig('')
  const secret = sig('')
  const save = async () => {
    if (await model.saveClient(kind.id, id.get().trim(), secret.get().trim())) done()
  }
  return stack(
    div({ class: 'flex flex-col gap-1' }, ...setup.steps.split('\n').map(line => sheetText(line))),
    field(kit, { key: 'id', label: 'Client ID' }, id),
    field(kit, { key: 'secret', label: 'Client secret, if it has one', secret: true }, secret),
    problem(kit, model),
    actions(
      primaryAction({ size: 'sm', disabled: () => model.busy.get() || !id.get().trim(), onClick: () => void save() }, 'Save'),
      secondaryAction({ size: 'sm', onClick: () => model.choose(undefined) }, 'Cancel'),
      howTo(kit, setup.help),
    ),
  )
}

const signInStep = (kit: Kit, model: ConnectionsModel, kind: KindInfo, changeClient: () => void) => {
  const { checkRow, linkButton, openTab, primaryAction, secondaryAction, waitingLine } = kit
  const readOnly = sig(false)
  const idle = () =>
    actions(
      primaryAction({ size: 'sm', disabled: () => model.busy.get(), onClick: () => void model.connect(kind.id, readOnly.get()) }, `Connect ${kind.label}`),
      secondaryAction({ size: 'sm', onClick: () => model.choose(undefined) }, 'Cancel'),
      linkButton({ onClick: changeClient }, 'Change client'),
    )
  const waiting = (url: string) =>
    actions(
      waitingLine('Finish signing in on the page that opened'),
      linkButton({ onClick: () => openTab(url) }, 'Open it again'),
      secondaryAction({ size: 'sm', onClick: model.cancel }, 'Cancel'),
    )
  return stack(
    kind.readOnly ? checkRow({ title: 'Read only', meta: 'Plugins can look but not change anything', checked: readOnly, onToggle: readOnly.toggle() }) : null,
    dynamicChild(
      model.flow.map(flow => flow?.url),
      url => (url ? waiting(url) : idle()),
    ),
    problem(kit, model),
  )
}

const oauthPanel = (kit: Kit, model: ConnectionsModel, kind: KindInfo, setup: Setup) => {
  const editing = sig(!kind.client)
  return dynamicChild(editing, edit => (edit ? clientStep(kit, model, kind, setup, () => editing.set(false)) : signInStep(kit, model, kind, () => editing.set(true))))
}

const formPanel = (kit: Kit, model: ConnectionsModel, kind: KindInfo, fields: Field[]) => {
  const { primaryAction, secondaryAction } = kit
  const values = fields.map(item => [item, sig(item.value ?? '')] as const)
  const save = () => void model.saveForm(kind.id, Object.fromEntries(values.map(([item, value]) => [item.key, value.get()])))
  return stack(
    ...values.map(([item, value]) => field(kit, item, value)),
    problem(kit, model),
    actions(
      primaryAction({ size: 'sm', disabled: () => model.busy.get(), onClick: save }, 'Connect'),
      secondaryAction({ size: 'sm', onClick: () => model.choose(undefined) }, 'Cancel'),
      kind.help ? howTo(kit, kind.help) : null,
    ),
  )
}

export const connectPanel = (kit: Kit, model: ConnectionsModel, kind: KindInfo) => {
  if (kind.setup) return oauthPanel(kit, model, kind, kind.setup)
  return formPanel(kit, model, kind, kind.fields ?? [])
}
