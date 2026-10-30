import type { ThreadPcs, Wire } from '@sand/devices-contract'
import type { Fleet } from '../fleet/fleet'
import { placeOf } from './place'
import { directUrl } from './url'

export const createWire = (fleet: Fleet, threads: () => ThreadPcs | undefined): Wire => ({
  ready: (pc = fleet.home) => fleet.ready(pc),
  async call(request, input, pc = placeOf(request, input, fleet.home, threads()), options) {
    return fleet.connection(pc).call(request, input, options)
  },
  on: fleet.on,
  hello: (field, pc = fleet.home) => fleet.hello(field, pc),
  async fetch(path, init, pc = fleet.home, options) {
    return fleet.connection(pc).fetch(path, init, options)
  },
  url: (path, pc = fleet.home) => directUrl(fleet, path, pc),
})
