import { lazy } from '@sand/util'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

type AppMessage =
  | { kind: 'routes'; routes: string[] }
  | { kind: 'allow-notices' }
  | { kind: 'listen'; token: string }
  | { kind: 'unlisten' }
  | { kind: 'install'; url: string; sha256?: string }
  | { kind: 'save'; name: string; data: string }

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
  ]),
)

const androidApp = service<AndroidApp>('androidApp')

const dataUrlOf = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

const saveInApp = async (app: AndroidApp, name: string, blob: Blob) => app.send({ kind: 'save', name, data: await dataUrlOf(blob) })

const saveInBrowser = (name: string, blob: Blob) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

const saveFile = async (app: AndroidApp | undefined, name: string, blob: Blob) => (app ? saveInApp(app, name, blob) : saveInBrowser(name, blob))

export { androidApp, type AndroidApp, type AppMessage, appProtocol, type AppReply, appReplySchema, appStartSchema, saveFile }
