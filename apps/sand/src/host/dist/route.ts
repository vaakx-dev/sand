import type { HostBuild, HostDevices, HttpCall, HttpRoute } from '@sand/protocol'
import type { InstallKeys } from './installs'

export interface DistAuth {
  devices: Pick<HostDevices, 'get'>
  installs: Pick<InstallKeys, 'check' | 'step'>
}

interface BundleRouteOptions extends DistAuth {
  build: Pick<HostBuild, 'bundle'>
}

export const allowed = ({ url, device, admin }: HttpCall, { devices, installs }: DistAuth) => {
  const secret = url.searchParams.get('k')
  if (secret !== null) return Boolean(installs.check(secret))
  if (admin) return true
  return Boolean(device && devices.get(device)?.kind === 'pc')
}

export const reportSending = ({ url }: HttpCall, { installs }: DistAuth) => {
  const secret = url.searchParams.get('k')
  if (secret !== null) installs.step(secret, 'sand')
}

export const unauthorized = () => new Response('unauthorized', { status: 401, headers: { 'content-type': 'text/plain; charset=utf-8' } })

export const bundleRoute = (options: BundleRouteOptions): HttpRoute => ({
  method: 'GET',
  async handle(call) {
    if (!allowed(call, options)) return unauthorized()
    reportSending(call, options)
    const { build, bytes } = await options.build.bundle()
    return new Response(bytes, {
      headers: {
        'content-type': 'application/gzip',
        'content-disposition': `attachment; filename="sand-${build.id}.tar.gz"`,
        'cache-control': 'no-store',
        'x-sand-build': build.id,
        'x-sand-build-time': String(build.time),
      },
    })
  },
})
