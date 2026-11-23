import { lazy } from '@sand/util'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'
import type { PushTarget } from '../records'
import { pushTargetSchema } from '../schemas'

type AppMessage = { kind: 'routes'; routes: string[] } | { kind: 'subscribe'; key: string } | { kind: 'unsubscribe' }

type AppReply = { kind: 'push'; target: PushTarget } | { kind: 'push-failed'; reason: string } | { kind: 'network' }

interface AndroidApp {
  routes: string[]
  push: boolean
  send(message: AppMessage): void
  on(listener: (reply: AppReply) => void): Dispose
}

const appStartSchema = lazy(() => z.object({ routes: z.array(z.url({ protocol: /^https?$/ })).min(1), push: z.boolean() }))

const appReplySchema = lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('push'), target: pushTargetSchema() }),
    z.object({ kind: z.literal('push-failed'), reason: z.string() }),
    z.object({ kind: z.literal('network') }),
  ]),
)

const androidApp = service<AndroidApp>('androidApp')

export { androidApp, type AndroidApp, type AppMessage, type AppReply, appReplySchema, appStartSchema }
