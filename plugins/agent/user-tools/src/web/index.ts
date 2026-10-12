import type { Composer } from '@sand/composer-card/contract'
import { errorMessage, joinDisposers } from '@sand/kit'
import { pulse } from '@sand/kit/web'
import { effect, untrack, type Derive } from '@vaakx-dev/vrui'
import { definePlugin, type Context } from 'drydock'
import { noticeType, notifyName, secretName } from '../names'
import { createAccess } from './notice/access'
import { alertNotices } from './notice/alert'
import { noticeRow } from './notice/row'
import { alertsSection } from './notice/settings'
import { secretCard, type SendSecret } from './secret/card'
import { pendingSecret, type SecretAsk } from './secret/pending'

const sender =
  (ctx: Context<'wire'>, ask: SecretAsk): SendSecret =>
  value =>
    ctx.wire.call({ type: 'secret.answer', session: ask.thread, call: ask.call, value }).then(
      () => true,
      error => {
        ctx.notify?.push(errorMessage(error), { level: 'error' })
        return false
      },
    )

const mountSecret = (ctx: Context<'wire' | 'kit'>, composer: Composer, pending: Derive<SecretAsk | null>) =>
  effect(() => {
    const ask = pending.get()
    if (!ask) return
    const remove = untrack(() => composer.slot('above', () => secretCard(ctx.kit, ask, sender(ctx, ask)), -20))
    return () => void remove()
  })

export default definePlugin({
  name: 'user-tools-view',
  description: "Shows the agent's notices in the thread, as toasts and as system alerts while the page is hidden, and asks you for secrets in a password card",
  inject: ['threads', 'wire', 'kit'],
  uses: {
    transcript: 'notices are not shown in the thread',
    notify: 'notices show no toast',
    composer: 'secret requests cannot be answered, only skipped by stopping the turn',
    settings: 'system alerts can only be turned on from a notice',
  },
  apply(ctx) {
    const access = createAccess()
    alertNotices(ctx, access)
    const pending = pendingSecret(ctx, pulse(ctx, ['thread.select', 'thread.change', 'threads.change']))
    ctx.watch('composer', composer => (composer ? mountSecret(ctx, composer, pending) : undefined))
    ctx.watch('settings', settings => settings?.section({ page: 'interface', id: 'alerts', order: 20, render: () => alertsSection(ctx.kit, access) }))
    ctx.watch('transcript', transcript =>
      transcript
        ? joinDisposers(
            transcript.entry(noticeType, entry => noticeRow(ctx.kit, entry)),
            transcript.tool(notifyName, { icon: 'bell', verb: 'Notified you', activeVerb: 'Notifying you' }),
            transcript.tool(secretName, { icon: 'key', verb: 'Asked for a secret', activeVerb: 'Waiting for a secret' }),
          )
        : undefined,
    )
  },
})
