import { errorMessage } from '@sand/kit'
import type { NetworkState } from '../contract'
import type { Listen } from '../listen'
import { addresses } from './addresses'
import { hostnameFor } from './settings'

export const createListener = (listen: Listen, lan: boolean, requestedPort: number) => {
  let bound = { lan, server: listen(hostnameFor(lan), requestedPort) }
  const port = bound.server.port ?? requestedPort

  const urlsFor = (lan: boolean) => addresses(hostnameFor(lan), port)
  const urls = () => urlsFor(bound.lan)
  const state = (): NetworkState => ({ lan: bound.lan, urls: urls() })

  const bind = (lan: boolean) => {
    bound = { lan, server: listen(hostnameFor(lan), port) }
  }

  const rebind = async (lan: boolean) => {
    if (lan === bound.lan) return true
    const previous = bound.lan
    await bound.server.stop(true)
    try {
      bind(lan)
      return true
    } catch (error) {
      console.error(`sand could not listen on ${hostnameFor(lan)}:${port}: ${errorMessage(error)}`)
      bind(previous)
      return false
    }
  }

  const stop = () => bound.server.stop(true)

  return { port, urls, urlsFor, state, rebind, stop }
}

export type Listener = ReturnType<typeof createListener>
