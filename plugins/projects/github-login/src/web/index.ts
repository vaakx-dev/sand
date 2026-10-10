import { errorMessage } from '@sand/dom'
import { definePlugin } from 'drydock'
import { githubSection } from './section'
import { signInOpener } from './sheet/open'
import { githubControl } from './state'

export default definePlugin({
  name: 'github-login-web',
  description: 'GitHub section on the Accounts settings page: sign in once with gh, see which login agents use, and get a warning when gh is too old',
  inject: ['wire'],
  uses: {
    settings: 'no GitHub section',
    layout: 'the sign-in sheet lands loose on the stage',
    notify: 'no message after signing in or when an action fails',
  },
  apply(ctx) {
    const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
    const control = githubControl(ctx, fail)
    const open = signInOpener(ctx, control)
    ctx.on('wire.hello', () => void control.load())
    if (ctx.wire.state() === 'open') void control.load()
    ctx.watch('settings', settings => settings?.section({ page: 'accounts', id: 'github', order: -10, render: () => githubSection(control, open) }))
  },
})
