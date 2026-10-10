import { errorMessage, serial } from '@sand/kit'
import type { NetworkState } from '../contract'
import type { Listener } from './listener'
import { saveLan } from './settings'

const settleDelay = 200

export interface ToggleOptions {
  home: string
  listener: Listener
  changed(): Promise<void>
}

export const createToggle = ({ home, listener, changed }: ToggleOptions) => {
  let queue = Promise.resolve()
  const saving = serial()
  let timer: Timer | undefined
  let stopped = false

  const save = (lan: boolean) => saving(() => saveLan(home, lan))

  const apply = async (lan: boolean) => {
    if (stopped) return
    const bound = await listener.rebind(lan).catch(error => {
      console.error(`sand is not listening anymore: ${errorMessage(error)}`)
      return false
    })
    if (!bound) await save(listener.state().lan)
    await changed()
  }

  const set = async (lan: boolean): Promise<NetworkState> => {
    await save(lan)
    clearTimeout(timer)
    timer = setTimeout(() => {
      queue = queue.then(() => apply(lan)).catch(error => console.error(`sand could not switch networks: ${errorMessage(error)}`))
    }, settleDelay)
    return { lan, urls: listener.urlsFor(lan) }
  }

  const stop = () => {
    stopped = true
    clearTimeout(timer)
  }

  return { set, stop }
}
