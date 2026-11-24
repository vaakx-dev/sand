import { wire, wireHello } from '@sand/devices-contract'
import { place } from '@sand/ui-shell/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/reactive'
import { definePlugin } from 'drydock'
import type { LoginAccount } from '../contract'
import { addAccount } from './add/sheet'
import { stepFor } from './add/steps'
import { accountsPage } from './page'
import { planSheets } from './plan'
import { accountRename } from './rename'
import { loginState } from './state'
import { welcomeModel } from './welcome/model'
import { welcomeView } from './welcome/view'

const items = [{ id: 'add-account', label: 'Add an account', keywords: ['sign in', 'API key', 'plan', 'subscription', 'local server', 'Ollama', 'LM Studio'] }]

export default definePlugin({
  name: 'accounts-web',
  description: 'Accounts page in settings, and a sign-in screen while no account is found: sign in to plans other plugins offer, add API keys or local servers, or use accounts from another PC',
  inject: { wire, kit },
  apply(ctx) {
    const control = loginState(ctx)
    const add = addAccount(ctx, control)
    const rename = accountRename(ctx, control)
    const actions = { fix: (account: LoginAccount) => add.open(stepFor(account)), rename: (account: LoginAccount) => void rename(account) }
    const plans = planSheets(ctx, { control, actions, add })
    ctx.on(wireHello, () => void control.load())
    if (ctx.wire.ready()) void control.load()
    ctx.watch(settings, found => found?.page({ id: 'accounts', label: 'Accounts', icon: 'lock', group: 'accounts', order: 25, items, render: () => accountsPage(ctx.kit, { control, add, actions, plans }) }))
    const welcome = owned(ctx, () => welcomeModel(ctx, control))
    place(ctx, 'overlay', () => welcomeView(ctx.kit, welcome, control), 0.5)
  },
})
