import { errorMessage } from '@sand/util'

export const createOnceReport = (report: (error: unknown) => void) => {
  const last = new Map<string, string>()
  return {
    failed(key: string, error: unknown) {
      const message = errorMessage(error)
      if (last.get(key) === message) return
      last.set(key, message)
      report(error)
    },
    passed: (key: string) => void last.delete(key),
    clear: () => last.clear(),
  }
}

export type OnceReport = ReturnType<typeof createOnceReport>
