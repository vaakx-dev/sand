import { PcUnavailable, type RelayOutcome } from '@sand/devices-contract'

const callTimeout = 30_000
const hostMargin = 5_000

export const unwrap = <T>(outcome: RelayOutcome<T>): T => {
  if (outcome.ok) return outcome.value
  const { pc, name, status } = outcome.unavailable
  throw new PcUnavailable(pc, name, status)
}

export const hostWait = (timeout?: number) => (timeout ?? callTimeout) + hostMargin
