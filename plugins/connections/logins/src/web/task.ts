import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { dynamicChild, sig } from '@vaakx-dev/vrui'

export const task = () => {
  const busy = sig(false)
  const failure = sig('')
  const run = async (work: () => Promise<unknown>) => {
    busy.set(true)
    failure.set('')
    try {
      await work()
      return true
    } catch (error) {
      failure.set(errorMessage(error))
      return false
    } finally {
      busy.set(false)
    }
  }
  return { busy, failure, run }
}

export type Task = ReturnType<typeof task>

export const problem = ({ errorText }: Kit, { failure }: Task) => dynamicChild(failure, text => (text ? errorText(text) : null))
