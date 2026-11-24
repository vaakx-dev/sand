import { lazy } from '@sand/util'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'
import type { PushTarget } from '../records'
import { pushTargetSchema } from '../schemas'

type AppMessage =
  | { kind: 'routes'; routes: string[] }
  | { kind: 'subscribe'; key: string }
  | { kind: 'unsubscribe' }
  | { kind: 'install'; url: string; sha256?: string }

type AppReply =
  | { kind: 'push'; target: PushTarget }
  | { kind: 'push-failed'; reason: string }
  | { kind: 'network' }
  | { kind: 'install-progress'; fraction: number }
  | { kind: 'install-failed'; reason: string }
  | { kind: 'install-opened' }

interface AndroidApp {
  routes: string[]
  push: boolean
  versionCode?: number
  send(message: AppMessage): void
  on(listener: (reply: AppReply) => void): Dispose
}

const appProtocol = 1

const appStartSchema = lazy(() =>
  z.object({ routes: z.array(z.url({ protocol: /^https?$/ })).min(1), push: z.boolean(), versionCode: z.number().int().positive().optional() }),
)

const appReplySchema = lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('push'), target: pushTargetSchema() }),
    z.object({ kind: z.literal('push-failed'), reason: z.string() }),
    z.object({ kind: z.literal('network') }),
    z.object({ kind: z.literal('install-progress'), fraction: z.number().min(0).max(1) }),
    z.object({ kind: z.literal('install-failed'), reason: z.string() }),
    z.object({ kind: z.literal('install-opened') }),
  ]),
)

const androidApp = service<AndroidApp>('androidApp')

export { androidApp, type AndroidApp, type AppMessage, appProtocol, type AppReply, appReplySchema, appStartSchema }
