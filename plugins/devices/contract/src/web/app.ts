import { lazy } from '@sand/util'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

type AppMessage =
  | { kind: 'routes'; routes: string[] }
  | { kind: 'allow-notices' }
  | { kind: 'listen'; token: string }
  | { kind: 'unlisten' }
  | { kind: 'install'; url: string; sha256?: string }

type AppReply =
  | { kind: 'notices-allowed' }
  | { kind: 'notices-refused'; reason: string }
  | { kind: 'network' }
  | { kind: 'install-progress'; fraction: number }
  | { kind: 'install-failed'; reason: string }
  | { kind: 'install-opened' }

interface AndroidApp {
  routes: string[]
  versionCode?: number
  send(message: AppMessage): void
  on(listener: (reply: AppReply) => void): Dispose
}

const appProtocol = 2

const appStartSchema = lazy(() =>
  z.object({ routes: z.array(z.url({ protocol: /^https?$/ })).min(1), versionCode: z.number().int().positive().optional() }),
)

const appReplySchema = lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('notices-allowed') }),
    z.object({ kind: z.literal('notices-refused'), reason: z.string() }),
    z.object({ kind: z.literal('network') }),
    z.object({ kind: z.literal('install-progress'), fraction: z.number().min(0).max(1) }),
    z.object({ kind: z.literal('install-failed'), reason: z.string() }),
    z.object({ kind: z.literal('install-opened') }),
  ]),
)

const androidApp = service<AndroidApp>('androidApp')

export { androidApp, type AndroidApp, type AppMessage, appProtocol, type AppReply, appReplySchema, appStartSchema }
