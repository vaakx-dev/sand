import { isPcUnavailable, type RelayOutcome } from '@sand/devices-contract'

export const relayed = async <T>(work: () => Promise<T>): Promise<RelayOutcome<T>> => {
  try {
    return { ok: true, value: await work() }
  } catch (error) {
    if (!isPcUnavailable(error)) throw error
    return { ok: false, unavailable: { pc: error.pc, name: error.pcName, status: error.status } }
  }
}
