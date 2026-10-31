import { errorMessage } from '@sand/util'

export const rolledBack = async (error: unknown, undo: () => Promise<unknown>) => {
  try {
    await undo()
    return error
  } catch (cleanup) {
    return new Error(`${errorMessage(error)}\n${errorMessage(cleanup)}`)
  }
}
