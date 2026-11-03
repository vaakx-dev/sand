import { helloField, wireEvent } from '@sand/host-hub/contract'

export interface StatusChange {
  session: string
  text: string | null
}

export const helloSettledStatus = helloField<Record<string, string>>('settledStatus')

export const settledStatusChange = wireEvent<StatusChange>('settledStatus.change')
