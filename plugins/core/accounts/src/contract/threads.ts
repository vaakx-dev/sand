import type { ProviderCapabilities } from './llm'

export class ThreadLost extends Error {
  override name = 'ThreadLost'
}

export const statelessCaps = (reconfigure: ProviderCapabilities['reconfigure'] = [], cacheTtlMs = 0): ProviderCapabilities => ({
  native: false,
  resume: false,
  inject: false,
  steer: false,
  reconfigure,
  processScope: 'thread',
  cacheTtlMs,
})
