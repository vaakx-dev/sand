import type { Hub } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { HostAnswer, HostCall } from './contract'

export const answerRuntime = async (hub: Hub | undefined, runtime: string, { request, input }: HostCall): Promise<HostAnswer> => {
  if (!hub) return { error: 'the hub is not loaded' }
  try {
    return { result: await hub.answer(request, input, { device: runtime, kind: 'runtime' }) }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
