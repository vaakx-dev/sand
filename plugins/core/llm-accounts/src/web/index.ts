import { errorMessage } from '@sand/kit'
import { owned, place } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import { addAccount } from './add/sheet'
import { accountsPage } from './page'
import { loginState } from './state'
import { welcomeModel } from './welcome/model'
import { welcomeView } from './welcome/view'

export default definePlugin({
  name: 'llm-accounts-web',
  description: 'Accounts page in settings and the first-run welcome: sign in to plans other plugins offer, add API keys or local servers, or use accounts from another PC',
  inject: ['wire', 'kit'],
  uses: {
    settings: 'no Accounts page',
    modelSetup: 'after signing in, the welcome ends with Start a thread instead of picking models',
    layout: 'the welcome lands loose on the stage',
    models: 'the welcome also shows when another plugin offers models',
    threads: 'the welcome also covers a thread that has messages',
    composer: 'Start a thread does not focus the composer',
    notify: 'no message after signing in',
  },
  apply(ctx) {
    const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
    const control = loginState(ctx, fail)
    const add = addAccount(ctx, control)
    ctx.on('wire.hello', () => void control.load())
    if (ctx.wire.state() === 'open') void control.load()
    ctx.watch('settings', settings => settings?.page({ id: 'accounts', label: 'Accounts', icon: 'lock', order: 25, render: () => accountsPage(ctx.kit, control, add) }))
    const welcome = owned(ctx, () => welcomeModel(ctx, control))
    place(ctx, 'main', () => welcomeView(ctx.kit, welcome, control), 0.5)
  },
})
