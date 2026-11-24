import type { AndroidApp, AppReply } from '@sand/devices-contract'
import type { AndroidRelease, ReleaseInfo } from '@sand/host-updates/contract'
import { type Derive, derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

type Install = { step: 'idle' } | { step: 'downloading'; fraction: number } | { step: 'failed'; reason: string }

const IDLE: Install = { step: 'idle' }

const newerApp = (target: ReleaseInfo | undefined, versionCode: number | undefined): AndroidRelease | undefined => {
  const android = target?.android
  return android && versionCode && android.versionCode > versionCode ? android : undefined
}

const installAfter = (reply: AppReply): Install | undefined => {
  switch (reply.kind) {
    case 'install-progress':
      return { step: 'downloading', fraction: reply.fraction }
    case 'install-failed':
      return { step: 'failed', reason: reply.reason }
    case 'install-opened':
      return IDLE
  }
}

const createAppUpdate = (ctx: Context, app: AndroidApp, target: Derive<ReleaseInfo | undefined>) => {
  const offer = derive(() => newerApp(target.get(), app.versionCode))
  const install = sig<Install>(IDLE)
  ctx.effect(() =>
    app.on(reply => {
      const next = installAfter(reply)
      if (next) install.set(next)
    }),
  )
  const start = () => {
    const release = offer.get()
    if (!release || install.get().step === 'downloading') return
    install.set({ step: 'downloading', fraction: 0 })
    app.send({ kind: 'install', url: release.url, ...(release.sha256 && { sha256: release.sha256 }) })
  }
  return { offer, install, start }
}

type AppUpdate = ReturnType<typeof createAppUpdate>

export { type AppUpdate, createAppUpdate, newerApp }
