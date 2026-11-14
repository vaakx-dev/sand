import { connect, directTransport, type ViaRelay, viaTransport } from '@sand/devices-connect'
import { browserResumeStore, browserRouteStore, browserWake, pageVisible } from '@sand/devices-connect/browser'
import type { PcConnection, PcIdentity, Route, Signer } from '@sand/devices-contract'
import { hello, hubResync } from '@sand/host-hub/contract'
import { runtimeChanged } from '@sand/host-runtimes/contract'
import { securePage } from '../page/home'
import { type HelloMemory, helloMemory } from './hellos'

export interface PcLink {
  readonly pc: string
  readonly connection: PcConnection
  readonly hellos: HelloMemory
}

export interface LinkOptions {
  pc: string
  name?: string
  seeds: Route[]
  onPc: boolean
  signer: Signer
  relay(through: string): ViaRelay
  since(): string | undefined | Promise<string | undefined>
  greeted(retagged: boolean): void
  event(name: string, payload: unknown): void
  identified(identity: PcIdentity): void
  changed(): void
}

const routes = browserRouteStore()
const resumes = browserResumeStore()
const wake = browserWake()

export const openPcLink = (options: LinkOptions): PcLink => {
  const hellos = helloMemory(options.pc)
  const greeting = async () => hellos.greeting(await options.since())

  const regreet = () =>
    void greeting().then(input => connection.call(hello, input)).then(
      reply => options.greeted(hellos.take(reply)),
      () => {},
    )

  const connection = connect({
    target: { id: options.pc, ...(options.name && { name: options.name }) },
    seeds: options.seeds,
    signer: options.signer,
    transports: { direct: directTransport, via: through => viaTransport(options.relay(through), options.pc) },
    wake,
    store: routes,
    resume: resumes,
    secure: securePage(),
    onPc: options.onPc,
    visible: pageVisible,
    greeting,
    greeted: reply => options.greeted(hellos.take(reply)),
    event(name, payload) {
      if (name === runtimeChanged.id || name === hubResync.id) regreet()
      options.event(name, payload)
    },
    changed: options.changed,
    identified: options.identified,
  })

  return { pc: options.pc, connection, hellos }
}
