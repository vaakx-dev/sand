import { sheetSlot, type SheetSpec } from '@sand/ui-shell/contract'
import type { Kit, kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { LoginAccount, LoginRemoteAccount, LoginState } from '../contract'
import type { RowActions } from './account-menu'
import type { AddAccount } from './add/sheet'
import { planStep } from './add/steps'
import { accountLogo, planName, presence } from './names'
import { accountRow, type Rows } from './row'
import type { LoginControl } from './state'

interface Plan {
  kind: string
  name: string
  provider: string
  local: LoginAccount[]
  remote: LoginRemoteAccount[]
}

type Entry = { kind: 'account'; account: LoginAccount } | { kind: 'plan'; plan: Plan }

interface PlanParts {
  control: LoginControl
  actions: RowActions
  add: AddAccount
}

const listed = (state: LoginState) => state.accounts.filter(account => account.signedIn || account.added || (account.error && !account.pending))

const planOf = (account: LoginAccount) => (account.signIn ? account.kind : undefined)

const onPlan = (account: LoginRemoteAccount) => account.method === 'app' || account.method === 'oauth'

const pooledRemote = (state: LoginState) => state.remote.filter(account => account.inUse && onPlan(account))

const planFor = (state: LoginState, kind: string): Plan => {
  const base = state.accounts.find(account => account.kind === kind && account.signIn)
  const remote = pooledRemote(state).filter(account => account.kind === kind)
  return {
    kind,
    name: planName(base) || remote[0]?.label || kind,
    provider: base?.provider ?? remote[0]?.provider ?? kind,
    local: listed(state).filter(account => planOf(account) === kind),
    remote,
  }
}

const entriesOf = (state: LoginState): Entry[] => {
  const local = listed(state)
  const kinds = [...new Set([...local.flatMap(account => planOf(account) ?? []), ...pooledRemote(state).map(account => account.kind)])]
  const plans = new Map(kinds.map(kind => [kind, planFor(state, kind)]))
  const alone = (plan: Plan) => plan.local.length === 1 && !plan.remote.length
  const own = local.flatMap((account): Entry[] => {
    const plan = plans.get(planOf(account) ?? '')
    if (!plan || alone(plan)) return [{ kind: 'account', account }]
    return plan.local[0] === account ? [{ kind: 'plan', plan }] : []
  })
  const elsewhere = [...plans.values()].filter(plan => !plan.local.length).map((plan): Entry => ({ kind: 'plan', plan }))
  return [...own, ...elsewhere]
}

const summary = ({ local, remote }: Plan) => {
  const count = `${local.length + remote.length} accounts`
  const signedOut = local.filter(account => !account.signedIn).length
  return signedOut ? span({}, `${count} · `, span({ class: 'text-danger-400' }, `${signedOut} not signed in`)) : count
}

const planRow = (kit: Kit, plan: Plan, open: (plan: string) => void) =>
  kit.settingsRow({ lead: accountLogo(kit, plan.provider), title: plan.name, detail: summary(plan), onOpen: () => open(plan.kind) })

const remoteRow = ({ settingsRow }: Kit, account: LoginRemoteAccount) => settingsRow({ title: account.label, ...(account.email && { detail: account.email }) })

const pcGroup = (kit: Kit, accounts: LoginRemoteAccount[]) => {
  const [first] = accounts
  return kit.settingsSection({ title: first?.pc, action: presence(kit, !!first?.online) }, accounts.map(account => remoteRow(kit, account)))
}

const members = (kit: Kit, rows: Rows, { local, remote }: Plan) => {
  const own = local.map(account => accountRow(rows, account, true))
  if (!remote.length) return div({ class: 'contents' }, own)
  const pcs = Map.groupBy(remote, account => account.device)
  return div(
    { class: 'flex flex-col gap-4' },
    local.length ? kit.settingsSection({ title: 'This PC' }, own) : null,
    [...pcs.values()].map(accounts => pcGroup(kit, accounts)),
  )
}

const addAnother = ({ icon, secondaryAction }: Kit, { control, add }: PlanParts, plan: string) => {
  const base = untrack(() => control.account(plan))
  if (!base) return undefined
  return () => secondaryAction({ size: 'sm', onClick: () => add.open(planStep(base)) }, icon('plus', 'sm'), 'Add another')
}

const planSheet = (kit: Kit, parts: PlanParts, kind: string): SheetSpec => {
  const { contextMenu, emptyState } = kit
  const { control, actions } = parts
  const menu = contextMenu()
  const rows = { kit, control, actions, menu }
  const plan = derive(() => {
    const state = control.state.get()
    return state && planFor(state, kind)
  })
  const name = untrack(() => plan.get())?.name ?? kind
  const list = () => {
    const shown = untrack(() => plan.get())
    return shown && (shown.local.length || shown.remote.length) ? members(kit, rows, shown) : emptyState({ text: `No ${name} accounts yet.` })
  }
  return {
    label: name,
    title: name,
    size: 'md',
    body: () => div({ class: 'flex flex-col' }, menu.view(), dynamicChild(derive(() => JSON.stringify(plan.get())), list)),
    foot: addAnother(kit, parts, kind),
  }
}

const planSheets = (ctx: Context<{ kit: typeof kit }>, parts: PlanParts) => {
  const sheet = sheetSlot(ctx)
  return { open: (plan: string) => sheet.open(() => planSheet(ctx.kit, parts, plan)) }
}

type PlanSheets = ReturnType<typeof planSheets>

export { entriesOf, listed, onPlan, planRow, planSheets, pooledRemote, type PlanSheets }
