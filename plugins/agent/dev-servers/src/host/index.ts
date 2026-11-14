import { auth } from '@sand/devices-contract'
import { hostHttp, type ListenScope } from '@sand/host-gateway/contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { devServerProxiesKeep, devServerProxy } from '../contract'
import { createPasses } from './passes'
import { createProxy, type Proxy } from './proxy'

const HOSTNAMES: Record<ListenScope, string[]> = { local: ['127.0.0.1'], network: ['::', '0.0.0.0'] }

export default definePlugin({
  name: 'dev-servers-host',
  description: "Carries the web servers threads started to your paired devices: each gets a port on sand's own addresses that only a device sand gave a link to can open",
  inject: { hub, hostHttp, auth },
  apply(ctx) {
    const passes = createPasses()
    const proxies = new Map<number, { proxy: Proxy; scope: ListenScope }>()

    const close = (port: number) => {
      proxies.get(port)?.proxy.stop()
      proxies.delete(port)
    }

    const proxyFor = (port: number, address: string) => {
      const scope = ctx.hostHttp.scope()
      const known = proxies.get(port)
      if (known?.scope === scope && known.proxy.upstream.address === address) return known.proxy
      close(port)
      const proxy = createProxy({ upstream: { port, address }, passes, hostnames: HOSTNAMES[scope] })
      proxies.set(port, { proxy, scope })
      return proxy
    }

    ctx.effect(() =>
      ctx.hub.handle(devServerProxy, ({ port, address, device }) => {
        const proxy = proxyFor(port, address)
        const ticket = passes.ticket(device, port)
        return ctx.hostHttp.addresses().map(host => proxy.link(host, ticket))
      }),
    )
    ctx.effect(() =>
      ctx.hub.handle(devServerProxiesKeep, ({ ports }) => {
        const kept = new Set(ports)
        for (const port of [...proxies.keys()]) if (!kept.has(port)) close(port)
      }),
    )
    ctx.effect(() => ctx.auth.onRevoke(passes.drop))
    ctx.effect(() => () => [...proxies.keys()].forEach(close))
  },
})
