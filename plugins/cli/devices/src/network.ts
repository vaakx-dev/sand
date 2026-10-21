import type { Daemon } from '@sand/host-daemon/contract'
import { networkGet, networkSet } from '@sand/host-gateway/contract'

const switches: Record<string, boolean> = { on: true, off: false }

const readSwitch = (value?: string) => {
  if (value === undefined) return
  const lan = switches[value]
  if (lan === undefined) throw new Error('usage: sand devices lan [on | off]')
  return lan
}

export const network = async (daemon: Daemon, value?: string) => {
  const lan = readSwitch(value)
  const state = await (lan === undefined ? daemon.request(networkGet, {}) : daemon.request(networkSet, { lan }))
  console.log(
    [
      state.lan ? 'sand listens on the home network:' : 'sand only listens on this computer:',
      ...state.urls.map(url => `  ${url}`),
      ...(state.lan ? ['run `sand devices` to pair a phone'] : []),
    ].join('\n'),
  )
}
