import { auth, peers, tailscale, type TailscaleShare } from '@sand/devices-contract'
import { hostHttp, type ListenScope } from '@sand/host-gateway/contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { devServerProxiesKeep, devServerProxy, devServerRelay } from '../contract'
import { createPasses } from './passes'
import { createProxy, type Proxy } from './proxy'
import { createRelay, type Relay } from './relay'

interface Opened<T> {
  open: T
  scope: ListenScope
  share: Promise<TailscaleShare | undefined>
}

const HOSTNAMES: Record<ListenScope, string[]> = { local: ['127.0.0.1'], network: ['::', '0.0.0.0'] }

const originOf = (address: string, port: number) => `http://${address.includes(':') ? `[${address}]` : address}:${port}`

const opened = <T extends { stop(): void }>() => {
  const all = new Map<string, Opened<T>>()
  const close = (key: string) => {
    const known = all.get(key)
    all.delete(key)
    known?.open.stop()
    void known?.share.then(share => share?.stop())
  }
  return { all, close, closeAll: () => [...all.keys()].forEach(close) }
}

export default definePlugin({
  name: 'dev-servers-host',
  description:
    "Carries the web servers threads started to your paired devices: each gets a port on sand's own addresses and on its Tailscale HTTPS address that only a device sand gave a link to can open, relayed through this PC for PCs your device can't reach directly",
  inject: { hub, hostHttp, auth },
  apply(ctx) {
    const passes = createPasses()
    const proxies = opened<Proxy>()
    const relays = opened<Relay>()

    const openOn = <T extends { port: number; stop(): void }>(kept: ReturnType<typeof opened<T>>, key: string, fits: (open: T) => boolean, start: (hostnames: string[]) => T) => {
      const scope = ctx.hostHttp.scope()
      const known = kept.all.get(key)
      if (known && known.scope === scope && fits(known.open)) return known
      kept.close(key)
      const open = start(HOSTNAMES[scope])
      const entry = { open, scope, share: ctx.get(tailscale)?.share(open.port) ?? Promise.resolve(undefined) }
      kept.all.set(key, entry)
      return entry
    }

    const linksOf = async ({ open, share }: Opened<{ port: number }>, path: string) => {
      const tailnet = await share
      const origins = [...(tailnet ? [tailnet.url] : []), ...ctx.hostHttp.addresses().map(address => originOf(address, open.port))]
      return origins.map(origin => origin + path)
    }

    const proxyFor = (port: number, address: string) =>
      openOn(proxies, String(port), proxy => proxy.upstream.address === address, hostnames => createProxy({ upstream: { port, address }, passes, hostnames }))

    const relayFor = (hostname: string, port: number) => {
      const key = `${hostname} ${port}`
      return openOn(relays, key, () => true, hostnames => createRelay({ hostname, port }, hostnames, () => relays.close(key)))
    }

    const relay = ({ pc, links }: { pc: string; links: string[] }) => {
      const direct = ctx.get(peers)?.directUrl(pc)
      if (!direct) throw new Error("This PC doesn't reach that PC directly either")
      const reachable = links.map(link => new URL(link)).find(link => link.hostname === new URL(direct).hostname)
      if (!reachable) throw new Error("That PC's sand doesn't listen on the address this PC reaches it at")
      return linksOf(relayFor(reachable.hostname.replace(/^\[|\]$/g, ''), Number(reachable.port)), reachable.pathname + reachable.search)
    }

    ctx.effect(() =>
      ctx.hub.handle(devServerProxy, ({ port, address, device }) => {
        const entry = proxyFor(port, address)
        return linksOf(entry, entry.open.path(passes.ticket(device, port)))
      }),
    )
    ctx.effect(() =>
      ctx.hub.handle(devServerProxiesKeep, ({ ports }) => {
        const kept = new Set(ports.map(String))
        for (const key of [...proxies.all.keys()]) if (!kept.has(key)) proxies.close(key)
      }),
    )
    ctx.effect(() => ctx.hub.handle(devServerRelay, relay))
    ctx.effect(() => ctx.auth.onRevoke(passes.drop))
    ctx.effect(() => () => {
      proxies.closeAll()
      relays.closeAll()
    })
  },
})
