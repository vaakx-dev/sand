import { sheetSlot, type SheetSpec } from '@sand/ui-shell/contract'
import type { Kit, kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { LoginAccount, LoginState } from '../contract'
import type { RowActions } from './account-menu'
import type { AddAccount } from './add/sheet'
import { planStep } from './add/steps'
import { accountLogo, planName } from './names'
import { accountRow } from './row'
import type { LoginControl } from './state'

type Entry = { kind: 'account'; account: LoginAccount } | { kind: 'plan'; account: LoginAccount; accounts: LoginAccount[] }

interface PlanParts {
  control: LoginControl
  actions: RowActions
  add: AddAccount
}

const listed = (state: LoginState) => state.accounts.filter(account => account.signedIn || account.added || (account.error && !account.pending))

const planOf = (account: LoginAccount) => (account.signIn ? account.kind : undefined)

const entriesOf = (accounts: LoginAccount[]): Entry[] => {
  const plans = Map.groupBy(accounts.filter(planOf), account => account.kind)
  return accounts.flatMap((account): Entry[] => {
    const plan = planOf(account)
    const group = plan ? plans.get(plan) : undefined
    if (!plan || !group || group.length === 1) return [{ kind: 'account', account }]
    return group[0] === account ? [{ kind: 'plan', account, accounts: group }] : []
  })
}

const planAccounts = (state: LoginState | undefined, plan: string) => (state ? listed(state).filter(account => planOf(account) === plan) : [])

const summary = (accounts: LoginAccount[]) => {
  const count = `${accounts.length} accounts`
  const signedOut = accounts.filter(account => !account.signedIn).length
  return signedOut ? span({}, `${count} · `, span({ class: 'text-danger-400' }, `${signedOut} not signed in`)) : count
}

const planRow = (kit: Kit, { account, accounts }: { account: LoginAccount; accounts: LoginAccount[] }, open: (plan: string) => void) =>
  kit.settingsRow({ lead: accountLogo(kit, account.provider), title: planName(account), detail: summary(accounts), onOpen: () => open(account.kind) })

const addAnother = ({ icon, secondaryAction }: Kit, { control, add }: PlanParts, plan: string) => {
  const base = untrack(() => control.account(plan))
  if (!base) return undefined
  return () => secondaryAction({ size: 'sm', onClick: () => add.open(planStep(base)) }, icon('plus', 'sm'), 'Add another')
}

const planSheet = (kit: Kit, parts: PlanParts, plan: string): SheetSpec => {
  const { contextMenu, emptyState } = kit
  const { control, actions } = parts
  const menu = contextMenu()
  const rows = { kit, control, actions, menu }
  const accounts = derive(() => planAccounts(control.state.get(), plan))
  const name = planName(untrack(() => accounts.get())[0])
  const list = () => {
    const shown = untrack(() => accounts.get())
    return shown.length ? div({ class: 'contents' }, shown.map(account => accountRow(rows, account, true))) : emptyState({ text: `No ${name} accounts on this PC.` })
  }
  return {
    label: name,
    title: name,
    size: 'md',
    body: () => div({ class: 'flex flex-col' }, menu.view(), dynamicChild(derive(() => JSON.stringify(accounts.get())), list)),
    foot: addAnother(kit, parts, plan),
  }
}

const planSheets = (ctx: Context<{ kit: typeof kit }>, parts: PlanParts) => {
  const sheet = sheetSlot(ctx)
  return { open: (plan: string) => sheet.open(() => planSheet(ctx.kit, parts, plan)) }
}

type PlanSheets = ReturnType<typeof planSheets>

export { entriesOf, listed, planRow, planSheets, type PlanSheets }
