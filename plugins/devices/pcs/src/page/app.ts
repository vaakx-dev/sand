import { type AndroidApp, appReplySchema, appStartSchema, type PcConnection, type WakeSource } from '@sand/devices-contract'
import { joinDisposers, lazy } from '@sand/util'
import { listen } from '@vaakx-dev/vrui'

interface AppPort extends EventTarget {
  postMessage(message: string): void
}

declare global {
  interface Window {
    sandApp?: AppPort
    sandAppStart?: unknown
  }
}

const replyOf = (data: unknown) => {
  if (typeof data !== 'string') return undefined
  try {
    return appReplySchema().safeParse(JSON.parse(data)).data
  } catch {
    return undefined
  }
}

const appOver = (port: AppPort, start: Pick<AndroidApp, 'routes' | 'push' | 'versionCode'>): AndroidApp => ({
  ...start,
  send: message => port.postMessage(JSON.stringify(message)),
  on: listener =>
    listen<MessageEvent<unknown>>(port, 'message', event => {
      const reply = replyOf(event.data)
      if (reply) listener(reply)
    }),
})

export const thisApp = lazy((): AndroidApp | undefined => {
  const start = appStartSchema().safeParse(window.sandAppStart).data
  return window.sandApp && start ? appOver(window.sandApp, start) : undefined
})

const reachableUrls = (connection: PcConnection) => {
  const status = connection.status()
  const connected = status.phase === 'connected' ? [status.route.url] : []
  const usable = connection.diagnosis().routes.filter(entry => entry.usable).map(entry => entry.route.url)
  return [...new Set([...connected, ...usable])].filter(url => url !== undefined)
}

const routeReporter = (app: AndroidApp) => {
  let told = ''
  return (connection: PcConnection) => {
    const routes = reachableUrls(connection)
    const json = JSON.stringify(routes)
    if (!routes.length || json === told) return
    told = json
    app.send({ kind: 'routes', routes })
  }
}

const noReporter = () => {}

export const appRouteReporter = (): ((connection: PcConnection) => void) => {
  const app = thisApp()
  return app ? routeReporter(app) : noReporter
}

export const withAppNetwork = (source: WakeSource): WakeSource => {
  const app = thisApp()
  if (!app) return source
  return {
    online: source.online,
    onWake: listener => joinDisposers(source.onWake(listener), app.on(reply => reply.kind === 'network' && listener('network'))),
  }
}
