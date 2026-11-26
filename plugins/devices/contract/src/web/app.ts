import { lazy } from '@sand/util'
import { a } from '@vaakx-dev/vrui'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

type AppMessage =
  | { kind: 'routes'; routes: string[] }
  | { kind: 'allow-notices' }
  | { kind: 'listen'; token: string }
  | { kind: 'unlisten' }
  | { kind: 'install'; url: string; sha256?: string }
  | { kind: 'save'; name: string; data: string }
  | { kind: 'take-share' }

interface AppFile {
  url: string
  name: string
  type: string
}

type AppReply =
  | { kind: 'notices-allowed' }
  | { kind: 'notices-refused'; reason: string }
  | { kind: 'network' }
  | { kind: 'install-progress'; fraction: number }
  | { kind: 'install-failed'; reason: string }
  | { kind: 'install-opened' }
  | { kind: 'share-waiting' }
  | { kind: 'share'; text: string; files: AppFile[] }

interface AndroidApp {
  routes: string[]
  versionCode?: number
  send(message: AppMessage): void
  on(listener: (reply: AppReply) => void): Dispose
  onBack(close: () => boolean): Dispose
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
    z.object({ kind: z.literal('share-waiting') }),
    z.object({
      kind: z.literal('share'),
      text: z.string(),
      files: z.array(z.object({ url: z.string().startsWith('/'), name: z.string().min(1), type: z.string().min(1) })),
    }),
  ]),
)

const androidApp = service<AndroidApp>('androidApp')

const dataUrlOf = async (blob: Blob) => `data:${blob.type || 'application/octet-stream'};base64,${(await blob.bytes()).toBase64()}`

const saveInApp = async (app: AndroidApp, name: string, blob: Blob) => app.send({ kind: 'save', name, data: await dataUrlOf(blob) })

const saveInBrowser = (name: string, blob: Blob) => {
  const href = URL.createObjectURL(blob)
  a({ href, download: name }).click()
  URL.revokeObjectURL(href)
}

const saveFile = async (app: AndroidApp | undefined, name: string, blob: Blob) => (app ? saveInApp(app, name, blob) : saveInBrowser(name, blob))

export { androidApp, type AndroidApp, type AppFile, type AppMessage, appProtocol, type AppReply, appReplySchema, appStartSchema, saveFile }
