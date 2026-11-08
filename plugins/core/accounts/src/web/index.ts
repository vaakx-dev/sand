import { wire, wireHello } from '@sand/devices-contract'
import { place } from '@sand/ui-shell/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { addAccount } from './add/sheet'
import { accountsPage } from './page'
import { loginState } from './state'
import { welcomeModel } from './welcome/model'
import { welcomeView } from './welcome/view'

export default definePlugin({
  name: 'accounts-web',
  description: 'Accounts page in settings and the first-run welcome: sign in to plans other plugins offer, add API keys or local servers, or use accounts from another PC',
  inject: { wire, kit },
  apply(ctx) {
    const control = loginState(ctx)
    const add = addAccount(ctx, control)
    ctx.on(wireHello, () => void control.load())
    if (ctx.wire.ready()) void control.load()
    ctx.watch(settings, found => found?.page({ id: 'accounts', label: 'Accounts', intro: 'The sign-ins and API keys your models run on.', icon: 'lock', group: 'accounts', order: 25, render: () => accountsPage(ctx.kit, control, add) }))
    const welcome = owned(ctx, () => welcomeModel(ctx, control))
    place(ctx, 'overlay', () => welcomeView(ctx.kit, welcome, control), 0.5)
  },
})
