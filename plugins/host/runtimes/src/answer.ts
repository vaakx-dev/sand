import type { Caller, Hub } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { HostAnswer, HostCall } from './contract'

const callerOf = (runtime: string, { caller }: HostCall): Caller => (caller?.kind === 'agent' ? caller : { device: runtime, kind: 'runtime' })

export const answerRuntime = async (hub: Pick<Hub, 'answer'> | undefined, runtime: string, call: HostCall): Promise<HostAnswer> => {
  if (!hub) return { error: 'the hub is not loaded' }
  try {
    return { result: await hub.answer(call.request, call.input, callerOf(runtime, call)) }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
