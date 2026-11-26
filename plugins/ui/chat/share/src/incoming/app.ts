import type { AndroidApp, AppFile } from '@sand/devices-contract'
import type { Shared } from '@sand/web/contract'

const fileOf = async ({ url, name, type }: AppFile) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${name} is no longer on this phone`)
  return new File([await response.blob()], name, { type })
}

const appShares = (app: AndroidApp, receive: (shared: Promise<Shared>) => void) => {
  const take = () => app.send({ kind: 'take-share' })
  const stop = app.on(reply => {
    switch (reply.kind) {
      case 'share-waiting':
        return take()
      case 'share':
        return receive(Promise.all(reply.files.map(fileOf)).then(files => ({ text: reply.text, files })))
    }
  })
  take()
  return stop
}

export { appShares }
